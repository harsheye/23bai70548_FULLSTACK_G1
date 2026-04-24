const pool = require('../config/database');
const minioClient = require('../config/minio');
const crypto = require('crypto');
const {
  getClientIp,
  getUserDailyUsage,
  getIpDailyUsage,
  incrementUserDailyUsage,
  incrementIpDailyUsage,
} = require('../services/runtimeLimits');

const BUCKET_NAME = 'file-sharing';
const ACCESS_LEVELS = ['view', 'download', 'edit'];
const USER_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const DAILY_IP_TRANSFER_LIMIT_BYTES = 500 * 1024 * 1024;

const ensureBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`Bucket '${BUCKET_NAME}' created successfully`);
    }
  } catch (error) {
    console.error('Error ensuring bucket:', error);
  }
};

ensureBucket();

const normalizeAccessLevel = (value, fallback = 'view') => {
  if (!value) return fallback;
  return ACCESS_LEVELS.includes(value) ? value : fallback;
};

const getPreviewKind = (mimeType = '') => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  return 'binary';
};

const getPathParts = (fileName = '') => {
  const parts = fileName.split('/').filter(Boolean);
  return {
    path: parts.slice(0, -1).join('/'),
    name: parts[parts.length - 1] || fileName,
  };
};

const createShareToken = () => crypto.randomBytes(18).toString('hex');

const mapFileRecord = (file, permission = null, baseUrl = '') => {
  const pathParts = getPathParts(file.file_name);
  const privateUrl = file.share_token ? `${baseUrl}/file/private/${file.share_token}` : null;
  const publicUrl = file.public_share_token ? `${baseUrl}/file/public/${file.public_share_token}` : null;

  return {
    ...file,
    path: pathParts.path,
    display_name: pathParts.name,
    preview_kind: getPreviewKind(file.mime_type),
    permission,
    private_url: privateUrl,
    public_url: publicUrl,
    };
};

const getPagination = (req, defaultLimit = 20) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || defaultLimit, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
};

const createPagedResponse = (rows, offset, limit) => ({
  items: rows.slice(0, limit),
  pagination: {
    offset,
    limit,
    hasMore: rows.length > limit,
    nextOffset: rows.length > limit ? offset + limit : null,
  },
});

const getSortTimestamp = (file, sort = '') => {
  if (sort === 'public') {
    return file.is_public ? file.updated_at || file.created_at : file.created_at;
  }
  if (sort === 'accessed') return file.last_accessed_at || file.created_at;
  if (sort === 'updated') return file.last_edited_at || file.updated_at || file.created_at;
  if (sort === 'viewed') return file.last_viewed_at || file.created_at;
  return file.created_at;
};

const getUserStorageUsage = async (userId) => {
  const result = await pool.query(
    'SELECT COALESCE(SUM(file_size), 0) AS total FROM files WHERE user_id = $1',
    [userId]
  );
  return Number(result.rows[0]?.total || 0);
};

const getUserLimits = async (userId) => {
  const result = await pool.query(
    `SELECT storage_limit_bytes, daily_transfer_limit_bytes
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || {
    storage_limit_bytes: USER_STORAGE_LIMIT_BYTES,
    daily_transfer_limit_bytes: DAILY_IP_TRANSFER_LIMIT_BYTES,
  };
};

const ensureUserHasStorageCapacity = async (userId, nextFileSize, existingSize = 0) => {
  const currentUsage = await getUserStorageUsage(userId);
  const userLimits = await getUserLimits(userId);
  const storageLimit = Number(userLimits.storage_limit_bytes || USER_STORAGE_LIMIT_BYTES);
  const projectedUsage = currentUsage - existingSize + nextFileSize;

  if (projectedUsage > storageLimit) {
    const error = new Error('Storage limit exceeded for this account.');
    error.statusCode = 413;
    throw error;
  }
};

const ensureIpTransferCapacity = async (ipAddress, kind, byteCount) => {
  const usage = await getIpDailyUsage(ipAddress);
  const current = Number(usage?.[`${kind}_bytes`] || 0);

  if (current + byteCount > DAILY_IP_TRANSFER_LIMIT_BYTES) {
    const error = new Error(
      `Daily ${kind} limit exceeded for this IP. The cap is 500MB per IP per day.`
    );
    error.statusCode = 429;
    throw error;
  }
};

const ensureUserTransferCapacity = async (userId, kind, byteCount) => {
  const usage = await getUserDailyUsage(userId);
  const userLimits = await getUserLimits(userId);
  const current = Number(usage?.[`${kind}_bytes`] || 0);
  const transferLimit = Number(userLimits.daily_transfer_limit_bytes || DAILY_IP_TRANSFER_LIMIT_BYTES);

  if (current + byteCount > transferLimit) {
    const error = new Error(`Daily ${kind} limit exceeded for this account.`);
    error.statusCode = 429;
    throw error;
  }
};

const incrementFileCounter = async (fileId, field) => {
  await pool.query(
    `UPDATE files
     SET ${field} = COALESCE(${field}, 0) + 1
     WHERE id = $1`,
    [fileId]
  );
};

const getTransferUsageSnapshot = async (req) => {
  if (req.user?.id) {
    const usage = await getUserDailyUsage(req.user.id);
    const limits = await getUserLimits(req.user.id);
    const downloadBytesUsed = Number(usage?.download_bytes || 0);
    const transferLimitBytes = Number(limits.daily_transfer_limit_bytes || DAILY_IP_TRANSFER_LIMIT_BYTES);

    return {
      scope: 'account',
      download_bytes_used: downloadBytesUsed,
      transfer_limit_bytes: transferLimitBytes,
      remaining_bytes: Math.max(transferLimitBytes - downloadBytesUsed, 0),
    };
  }

  const usage = await getIpDailyUsage(getClientIp(req));
  const downloadBytesUsed = Number(usage?.download_bytes || 0);

  return {
    scope: 'guest',
    download_bytes_used: downloadBytesUsed,
    transfer_limit_bytes: DAILY_IP_TRANSFER_LIMIT_BYTES,
    remaining_bytes: Math.max(DAILY_IP_TRANSFER_LIMIT_BYTES - downloadBytesUsed, 0),
  };
};

const buildFileInsights = (file) => ({
  views: Number(file?.total_view_count || 0),
  downloads: Number(file?.total_download_count || 0),
  last_accessed_at: file?.last_accessed_at || null,
  last_viewed_at: file?.last_viewed_at || null,
  last_downloaded_at: file?.last_downloaded_at || null,
  uploaded_at: file?.created_at || null,
  updated_at: file?.updated_at || null,
});

const buildFileResponse = async ({ file, permission, baseUrl, req, shares = [], latestRequest = null }) => ({
  ...mapFileRecord(file, permission, baseUrl),
  shares,
  latestRequest,
  insights: buildFileInsights(file),
  transfer_usage: await getTransferUsageSnapshot(req),
});

const applySort = (sortValue = '') => {
  switch (sortValue) {
    case 'public':
      return 'f.is_public DESC, f.created_at DESC';
    case 'accessed':
      return 'COALESCE(f.last_accessed_at, f.created_at) DESC';
    case 'updated':
      return 'COALESCE(f.last_edited_at, f.updated_at, f.created_at) DESC';
    case 'viewed':
      return 'COALESCE(f.last_viewed_at, f.created_at) DESC';
    default:
      return 'f.created_at DESC';
  }
};

const touchFileMetadata = async (fileId, fields = []) => {
  if (!fields.length) return;

  const setClause = fields.map((field) => `${field} = CURRENT_TIMESTAMP`).join(', ');
  await pool.query(
    `UPDATE files
     SET ${setClause}
     WHERE id = $1`,
    [fileId]
  );
};

const sendControllerError = (res, error, fallbackMessage) => {
  res.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage,
    error: error.statusCode ? undefined : error.message,
  });
};

const getFileById = async (fileId) => {
  const result = await pool.query(
    `SELECT f.*, u.username AS owner_username, u.email AS owner_email
     FROM files f
     JOIN users u ON u.id = f.user_id
     WHERE f.id = $1`,
    [fileId]
  );

  return result.rows[0] || null;
};

const getShareForUser = async (fileId, userId) => {
  if (!userId) return null;

  const result = await pool.query(
    `SELECT sf.*, u.username, u.email
     FROM shared_files sf
     JOIN users u ON u.id = sf.shared_with_user_id
     WHERE sf.file_id = $1 AND sf.shared_with_user_id = $2`,
    [fileId, userId]
  );

  return result.rows[0] || null;
};

const getSharesForOwner = async (fileId) => {
  const result = await pool.query(
    `SELECT sf.id, sf.file_id, sf.shared_with_user_id, sf.access_level, sf.created_at,
            u.username, u.email
     FROM shared_files sf
     JOIN users u ON u.id = sf.shared_with_user_id
     WHERE sf.file_id = $1
     ORDER BY u.username ASC`,
    [fileId]
  );

  return result.rows;
};

const getRecentShareTargetsForOwner = async (ownerId) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.email, MAX(sf.created_at) AS last_shared_at
     FROM shared_files sf
     JOIN files f ON f.id = sf.file_id
     JOIN users u ON u.id = sf.shared_with_user_id
     WHERE f.user_id = $1
     GROUP BY u.id, u.username, u.email
     ORDER BY MAX(sf.created_at) DESC
     LIMIT 5`,
    [ownerId]
  );

  return result.rows;
};

const getAccessRequestStatusForUser = async (fileId, requesterUserId) => {
  if (!requesterUserId) return null;

  const result = await pool.query(
    `SELECT id, status, message, created_at, updated_at
     FROM file_access_requests
     WHERE file_id = $1 AND requester_user_id = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [fileId, requesterUserId]
  );

  return result.rows[0] || null;
};

const resolvePermission = ({ file, user, share }) => {
  if (!file) {
    return {
      allowed: false,
      canView: false,
      canDownload: false,
      canEdit: false,
      canDelete: false,
      canManageSharing: false,
      role: 'none',
      accessLevel: null,
    };
  }

  if (user && Number(file.user_id) === Number(user.id)) {
    return {
      allowed: true,
      canView: true,
      canDownload: true,
      canEdit: true,
      canDelete: true,
      canManageSharing: true,
      role: 'owner',
      accessLevel: 'edit',
    };
  }

  const accessLevel = share?.access_level || (file.is_public ? file.public_access_level || 'view' : null);

  if (!accessLevel) {
    return {
      allowed: false,
      canView: false,
      canDownload: false,
      canEdit: false,
      canDelete: false,
      canManageSharing: false,
      role: 'none',
      accessLevel: null,
    };
  }

  return {
    allowed: true,
    canView: true,
    canDownload: ['download', 'edit'].includes(accessLevel),
    canEdit: accessLevel === 'edit',
    canDelete: false,
    canManageSharing: false,
    role: share ? 'shared' : 'public',
    accessLevel,
  };
};

const getPermissionForRequest = async (fileId, user) => {
  const file = await getFileById(fileId);
  if (!file) {
    return { file: null, permission: resolvePermission({ file: null, user, share: null }) };
  }

  const share = user ? await getShareForUser(fileId, user.id) : null;
  const permission = resolvePermission({ file, user, share });

  return { file, share, permission };
};

const getFileByShareToken = async (shareToken) => {
  const result = await pool.query(
    `SELECT f.*, u.username AS owner_username, u.email AS owner_email
     FROM files f
     JOIN users u ON u.id = f.user_id
     WHERE f.share_token = $1`,
    [shareToken]
  );

  return result.rows[0] || null;
};

const getFileByPublicShareToken = async (publicShareToken) => {
  const result = await pool.query(
    `SELECT f.*, u.username AS owner_username, u.email AS owner_email
     FROM files f
     JOIN users u ON u.id = f.user_id
     WHERE f.public_share_token = $1`,
    [publicShareToken]
  );

  return result.rows[0] || null;
};

const streamFile = async (res, file, disposition = 'inline') => {
  const objectStream = await minioClient.getObject(BUCKET_NAME, file.minio_key);
  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  if (disposition === 'attachment') {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
  }
  objectStream.pipe(res);
};

const getBaseUrl = (req) => {
  const origin = req.headers.origin;
  if (origin) return origin;
  return `${req.protocol}://${req.get('host')}`;
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { originalname, mimetype, size, buffer } = req.file;
    const userId = req.user.id;
    const minioKey = `${userId}/${Date.now()}-${originalname}`;
    const shareToken = createShareToken();

    await ensureUserHasStorageCapacity(userId, size);
    await ensureUserTransferCapacity(userId, 'upload', size);

    await minioClient.putObject(BUCKET_NAME, minioKey, buffer, size, {
      'Content-Type': mimetype,
    });

    const result = await pool.query(
      `INSERT INTO files (user_id, file_name, minio_key, file_size, mime_type, is_public, public_access_level, share_token)
       VALUES ($1, $2, $3, $4, $5, FALSE, NULL, $6)
       RETURNING *`,
      [userId, originalname, minioKey, size, mimetype, shareToken]
    );

    await incrementUserDailyUsage(userId, 'upload', size);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: mapFileRecord(result.rows[0], {
        role: 'owner',
        accessLevel: 'edit',
        canView: true,
        canDownload: true,
        canEdit: true,
        canDelete: true,
        canManageSharing: true,
      }, getBaseUrl(req)),
    });
  } catch (error) {
    console.error('Upload error:', error);
    sendControllerError(res, error, 'Upload failed');
  }
};

const listFiles = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const search = (req.query.q || '').trim();
    const sortBy = applySort(req.query.sort);
    const { limit, offset } = getPagination(req, 20);
    const starredOnly = req.query.starred === 'true';
    const result = await pool.query(
      `SELECT f.*, u.username AS owner_username
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE f.user_id = $1
         AND ($2 = '' OR f.file_name ILIKE $3)
         AND ($4 = FALSE OR f.is_starred = TRUE)
       ORDER BY ${sortBy}
       LIMIT $5 OFFSET $6`,
      [req.user.id, search, `%${search}%`, starredOnly, limit + 1, offset]
    );

    res.json(
      createPagedResponse(
        result.rows.map((file) => mapFileRecord(file, resolvePermission({ file, user: req.user }), baseUrl)),
        offset,
        limit
      )
    );
  } catch (error) {
    console.error('List files error:', error);
    sendControllerError(res, error, 'Failed to list files');
  }
};

const getSharedFiles = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const search = (req.query.q || '').trim();
    const sortBy = applySort(req.query.sort);
    const { limit, offset } = getPagination(req, 20);
    const result = await pool.query(
      `SELECT f.*, sf.access_level, u.username AS shared_by_user, u.email AS owner_email
       FROM files f
       JOIN shared_files sf ON sf.file_id = f.id
       JOIN users u ON u.id = f.user_id
       WHERE sf.shared_with_user_id = $1
         AND ($2 = '' OR f.file_name ILIKE $3)
       ORDER BY ${sortBy}
       LIMIT $4 OFFSET $5`,
      [req.user.id, search, `%${search}%`, limit + 1, offset]
    );

    res.json(
      createPagedResponse(
        result.rows.map((file) =>
          mapFileRecord(file, {
            role: 'shared',
            accessLevel: file.access_level,
            canView: true,
            canDownload: ['download', 'edit'].includes(file.access_level),
            canEdit: file.access_level === 'edit',
            canDelete: false,
            canManageSharing: false,
          }, baseUrl)
        ),
        offset,
        limit
      )
    );
  } catch (error) {
    console.error('Get shared files error:', error);
    sendControllerError(res, error, 'Failed to load shared files');
  }
};

const searchFiles = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const query = (req.query.q || '').trim();
    const sortBy = applySort(req.query.sort);
    const { limit, offset } = getPagination(req, 20);
    const starredOnly = req.query.starred === 'true';

    if (req.user) {
      const result = await pool.query(
        `SELECT DISTINCT ON (f.id)
            f.*,
            u.username AS owner_username,
            u.email AS owner_email,
            sf.access_level AS shared_access_level
         FROM files f
         JOIN users u ON u.id = f.user_id
         LEFT JOIN shared_files sf
           ON sf.file_id = f.id
          AND sf.shared_with_user_id = $1
         WHERE (f.user_id = $1 OR sf.access_level IS NOT NULL OR f.is_public = TRUE)
           AND ($2 = '' OR f.file_name ILIKE $3)
           AND ($4 = FALSE OR f.is_starred = TRUE)
         ORDER BY f.id, ${sortBy}`,
        [req.user.id, query, `%${query}%`, starredOnly]
      );

      const rows = result.rows.map((file) =>
        mapFileRecord(
          file,
          resolvePermission({
            file,
            user: req.user,
            share: file.shared_access_level ? { access_level: file.shared_access_level } : null,
          }),
          baseUrl
        )
      );

      const sortedRows = rows.sort((left, right) => {
        if (req.query.sort === 'public') {
          const publicDiff = Number(Boolean(right.is_public)) - Number(Boolean(left.is_public));
          if (publicDiff !== 0) return publicDiff;
        }

        return new Date(getSortTimestamp(right, req.query.sort)) - new Date(getSortTimestamp(left, req.query.sort));
      });
      return res.json(createPagedResponse(sortedRows.slice(offset, offset + limit + 1), offset, limit));
    }

    const result = await pool.query(
      `SELECT f.*, u.username AS owner_username
       FROM files f
       JOIN users u ON u.id = f.user_id
       WHERE f.is_public = TRUE
         AND ($1 = '' OR f.file_name ILIKE $2)
       ORDER BY ${sortBy}
       LIMIT $3 OFFSET $4`,
      [query, `%${query}%`, limit + 1, offset]
    );

    res.json(
      createPagedResponse(
        result.rows.map((file) =>
          mapFileRecord(file, {
            role: 'public',
            accessLevel: file.public_access_level || 'view',
            canView: true,
            canDownload: ['download', 'edit'].includes(file.public_access_level),
            canEdit: file.public_access_level === 'edit',
            canDelete: false,
            canManageSharing: false,
          }, baseUrl)
        ),
        offset,
        limit
      )
    );
  } catch (error) {
    console.error('Search files error:', error);
    sendControllerError(res, error, 'Search failed');
  }
};

const getPublicFiles = async (req, res) => {
  req.query.q = req.query.q || '';
  return searchFiles(req, res);
};

const getFileDetails = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.allowed) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await touchFileMetadata(fileId, ['last_accessed_at']);

    let shares = [];
    if (permission.canManageSharing) {
      shares = await getSharesForOwner(fileId);
    }

    res.json(await buildFileResponse({ file, permission, baseUrl, req, shares }));
  } catch (error) {
    console.error('Get file details error:', error);
    sendControllerError(res, error, 'Failed to load file details');
  }
};

const getFileDetailsByPrivateToken = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const file = await getFileByShareToken(req.params.shareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });
    const latestRequest = req.user ? await getAccessRequestStatusForUser(file.id, req.user.id) : null;

    if (!req.user || !permission.allowed || permission.role === 'public') {
      return res.status(403).json({
        message: 'Access denied',
        file: mapFileRecord(file, permission, baseUrl),
        latestRequest,
      });
    }

    await touchFileMetadata(file.id, ['last_accessed_at']);

    res.json(
      await buildFileResponse({
        file,
        permission,
        baseUrl,
        req,
        shares: permission.canManageSharing ? await getSharesForOwner(file.id) : [],
        latestRequest,
      })
    );
  } catch (error) {
    console.error('Get private token details error:', error);
    sendControllerError(res, error, 'Failed to load file details');
  }
};

const getFileDetailsByPublicToken = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const file = await getFileByPublicShareToken(req.params.publicShareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });

    if (!file.is_public || !permission.allowed) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await touchFileMetadata(file.id, ['last_accessed_at']);

    res.json(await buildFileResponse({ file, permission, baseUrl, req, shares: [] }));
  } catch (error) {
    console.error('Get public token details error:', error);
    sendControllerError(res, error, 'Failed to load file details');
  }
};

const viewFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canView) {
      return res.status(403).json({ message: 'View access denied' });
    }

    await touchFileMetadata(fileId, ['last_accessed_at', 'last_viewed_at']);
    await incrementFileCounter(fileId, 'total_view_count');

    await streamFile(res, file, 'inline');
  } catch (error) {
    console.error('View file error:', error);
    sendControllerError(res, error, 'Failed to view file');
  }
};

const viewFileByPrivateToken = async (req, res) => {
  try {
    const file = await getFileByShareToken(req.params.shareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });

    if (!req.user || !permission.canView || permission.role === 'public') {
      return res.status(403).json({ message: 'View access denied' });
    }

    await touchFileMetadata(file.id, ['last_accessed_at', 'last_viewed_at']);
    await incrementFileCounter(file.id, 'total_view_count');
    await streamFile(res, file, 'inline');
  } catch (error) {
    console.error('View private token file error:', error);
    sendControllerError(res, error, 'Failed to view file');
  }
};

const viewFileByPublicToken = async (req, res) => {
  try {
    const file = await getFileByPublicShareToken(req.params.publicShareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });

    if (!file.is_public || !permission.canView) {
      return res.status(403).json({ message: 'View access denied' });
    }

    await touchFileMetadata(file.id, ['last_accessed_at', 'last_viewed_at']);
    await incrementFileCounter(file.id, 'total_view_count');
    await streamFile(res, file, 'inline');
  } catch (error) {
    console.error('View public token file error:', error);
    sendControllerError(res, error, 'Failed to view file');
  }
};

const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canDownload) {
      return res.status(403).json({ message: 'Download access denied' });
    }

    if (req.user?.id) {
      await ensureUserTransferCapacity(req.user.id, 'download', Number(file.file_size || 0));
    } else {
      await ensureIpTransferCapacity(getClientIp(req), 'download', Number(file.file_size || 0));
    }
    await touchFileMetadata(fileId, ['last_accessed_at', 'last_downloaded_at']);
    await incrementFileCounter(fileId, 'total_download_count');

    await streamFile(res, file, 'attachment');
    if (req.user?.id) {
      await incrementUserDailyUsage(req.user.id, 'download', Number(file.file_size || 0));
    } else {
      await incrementIpDailyUsage(getClientIp(req), 'download', Number(file.file_size || 0));
    }
  } catch (error) {
    console.error('Download error:', error);
    sendControllerError(res, error, 'Failed to download file');
  }
};

const downloadFileByPrivateToken = async (req, res) => {
  try {
    const file = await getFileByShareToken(req.params.shareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });

    if (!req.user || !permission.canDownload || permission.role === 'public') {
      return res.status(403).json({ message: 'Download access denied' });
    }

    await ensureUserTransferCapacity(req.user.id, 'download', Number(file.file_size || 0));
    await touchFileMetadata(file.id, ['last_accessed_at', 'last_downloaded_at']);
    await incrementFileCounter(file.id, 'total_download_count');
    await streamFile(res, file, 'attachment');
    await incrementUserDailyUsage(req.user.id, 'download', Number(file.file_size || 0));
  } catch (error) {
    console.error('Download private token error:', error);
    sendControllerError(res, error, 'Failed to download file');
  }
};

const downloadFileByPublicToken = async (req, res) => {
  try {
    const file = await getFileByPublicShareToken(req.params.publicShareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const share = req.user ? await getShareForUser(file.id, req.user.id) : null;
    const permission = resolvePermission({ file, user: req.user, share });

    if (!file.is_public || !permission.canDownload) {
      return res.status(403).json({ message: 'Download access denied' });
    }

    if (req.user?.id) {
      await ensureUserTransferCapacity(req.user.id, 'download', Number(file.file_size || 0));
    } else {
      await ensureIpTransferCapacity(getClientIp(req), 'download', Number(file.file_size || 0));
    }
    await touchFileMetadata(file.id, ['last_accessed_at', 'last_downloaded_at']);
    await incrementFileCounter(file.id, 'total_download_count');
    await streamFile(res, file, 'attachment');
    if (req.user?.id) {
      await incrementUserDailyUsage(req.user.id, 'download', Number(file.file_size || 0));
    } else {
      await incrementIpDailyUsage(getClientIp(req), 'download', Number(file.file_size || 0));
    }
  } catch (error) {
    console.error('Download public token error:', error);
    sendControllerError(res, error, 'Failed to download file');
  }
};

const updateFileMetadata = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canEdit) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    const updatedFileName =
      typeof req.body.fileName === 'string' && req.body.fileName.trim()
        ? req.body.fileName.trim()
        : file.file_name;

    const isPublic = typeof req.body.isPublic === 'boolean' ? req.body.isPublic : file.is_public;
    const isStarred = typeof req.body.isStarred === 'boolean' ? req.body.isStarred : file.is_starred;
    const publicAccessLevel = isPublic
      ? normalizeAccessLevel(req.body.publicAccessLevel || file.public_access_level || 'view')
      : null;
    const publicShareToken = isPublic ? file.public_share_token || createShareToken() : null;

    const result = await pool.query(
      `UPDATE files
       SET file_name = $2,
           is_public = $3,
           public_access_level = $4,
           is_starred = $5,
           public_share_token = $6,
           last_edited_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [fileId, updatedFileName, isPublic, publicAccessLevel, isStarred, publicShareToken]
    );

    res.json({
      message: 'File updated successfully',
      file: mapFileRecord(result.rows[0], permission, baseUrl),
    });
  } catch (error) {
    console.error('Update file metadata error:', error);
    sendControllerError(res, error, 'Failed to update file');
  }
};

const replaceFileContent = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No replacement file uploaded' });
    }

    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canEdit) {
      return res.status(403).json({ message: 'Edit access denied' });
    }

    await ensureUserHasStorageCapacity(file.user_id, req.file.size, Number(file.file_size || 0));
    await ensureUserTransferCapacity(req.user.id, 'upload', req.file.size);

    await minioClient.putObject(BUCKET_NAME, file.minio_key, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype,
    });

    const result = await pool.query(
      `UPDATE files
       SET file_size = $2,
           mime_type = $3,
           last_edited_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [fileId, req.file.size, req.file.mimetype]
    );

    await incrementUserDailyUsage(req.user.id, 'upload', req.file.size);

    res.json({
      message: 'File contents updated successfully',
      file: mapFileRecord(result.rows[0], permission),
    });
  } catch (error) {
    console.error('Replace file content error:', error);
    sendControllerError(res, error, 'Failed to replace file content');
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canDelete) {
      return res.status(403).json({ message: 'Delete access denied' });
    }

    await minioClient.removeObject(BUCKET_NAME, file.minio_key);
    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    sendControllerError(res, error, 'Failed to delete file');
  }
};

const shareFile = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canManageSharing) {
      return res.status(403).json({ message: 'Only the owner can manage sharing' });
    }

    const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    const accessLevel = normalizeAccessLevel(req.body.accessLevel);
    const isPublic = typeof req.body.isPublic === 'boolean' ? req.body.isPublic : file.is_public;
    const publicAccessLevel = isPublic
      ? normalizeAccessLevel(req.body.publicAccessLevel || file.public_access_level || 'view')
      : null;
    const publicShareToken = isPublic ? file.public_share_token || createShareToken() : null;

    for (const userId of userIds) {
      if (Number(userId) === Number(req.user.id)) {
        continue;
      }

      await pool.query(
        `INSERT INTO shared_files (file_id, shared_with_user_id, access_level)
         VALUES ($1, $2, $3)
         ON CONFLICT (file_id, shared_with_user_id)
         DO UPDATE SET access_level = EXCLUDED.access_level`,
        [fileId, userId, accessLevel]
      );
    }

    await pool.query(
      `UPDATE files
       SET is_public = $2,
           public_access_level = $3,
           public_share_token = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [fileId, isPublic, publicAccessLevel, publicShareToken]
    );

    const shares = await getSharesForOwner(fileId);

    res.json({
      message: 'Sharing settings updated successfully',
      shares,
      privateUrl: file.share_token ? `${baseUrl}/file/private/${file.share_token}` : null,
      publicShare: {
        isPublic,
        publicAccessLevel,
        publicUrl: isPublic ? `${baseUrl}/file/public/${publicShareToken}` : null,
      },
    });
  } catch (error) {
    console.error('Share error:', error);
    sendControllerError(res, error, 'Failed to update sharing');
  }
};

const removeShare = async (req, res) => {
  try {
    const { fileId, sharedUserId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canManageSharing) {
      return res.status(403).json({ message: 'Only the owner can manage sharing' });
    }

    await pool.query(
      'DELETE FROM shared_files WHERE file_id = $1 AND shared_with_user_id = $2',
      [fileId, sharedUserId]
    );

    res.json({ message: 'Share removed successfully' });
  } catch (error) {
    console.error('Remove share error:', error);
    sendControllerError(res, error, 'Failed to remove share');
  }
};

const createAccessRequest = async (req, res) => {
  try {
    const file = await getFileByShareToken(req.params.shareToken);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (Number(file.user_id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'Owners do not need to request access' });
    }

    const share = await getShareForUser(file.id, req.user.id);
    const permission = resolvePermission({ file, user: req.user, share });
    if (permission.allowed) {
      return res.status(400).json({ message: 'You already have access to this file' });
    }

    const existingPending = await pool.query(
      `SELECT id
       FROM file_access_requests
       WHERE file_id = $1 AND requester_user_id = $2 AND status = 'pending'
       LIMIT 1`,
      [file.id, req.user.id]
    );

    if (existingPending.rows.length) {
      return res.status(409).json({ message: 'An access request is already pending' });
    }

    const result = await pool.query(
      `INSERT INTO file_access_requests (file_id, requester_user_id, owner_user_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [file.id, req.user.id, file.user_id, (req.body.message || '').trim() || null]
    );

    res.status(201).json({ message: 'Access request sent', request: result.rows[0] });
  } catch (error) {
    console.error('Create access request error:', error);
    sendControllerError(res, error, 'Failed to create access request');
  }
};

const listAccessRequests = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    const sort = req.query.sort || 'created';
    const status = (req.query.status || '').trim();
    const sortSql =
      sort === 'updated'
        ? 'COALESCE(far.updated_at, far.created_at) DESC'
        : sort === 'resolved'
          ? 'COALESCE(far.resolved_at, far.updated_at, far.created_at) DESC'
          : 'far.created_at DESC';

    const result = await pool.query(
      `SELECT far.*, f.file_name, f.share_token, f.public_share_token, u.username AS requester_username, u.email AS requester_email
       FROM file_access_requests far
       JOIN files f ON f.id = far.file_id
       JOIN users u ON u.id = far.requester_user_id
       WHERE far.owner_user_id = $1
         AND ($2 = '' OR far.status = $2)
         AND ($3 = '' OR f.file_name ILIKE $4 OR u.username ILIKE $4 OR u.email ILIKE $4)
       ORDER BY ${sortSql}`,
      [req.user.id, status, query, `%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('List access requests error:', error);
    sendControllerError(res, error, 'Failed to load access requests');
  }
};

const resolveAccessRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const action = req.body.action === 'approve' ? 'approved' : 'declined';

    const requestResult = await pool.query(
      `SELECT * FROM file_access_requests WHERE id = $1 AND owner_user_id = $2`,
      [requestId, req.user.id]
    );

    if (!requestResult.rows.length) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requestResult.rows[0];
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been resolved' });
    }

    if (action === 'approved') {
      await pool.query(
        `INSERT INTO shared_files (file_id, shared_with_user_id, access_level)
         VALUES ($1, $2, 'view')
         ON CONFLICT (file_id, shared_with_user_id)
         DO UPDATE SET access_level = EXCLUDED.access_level`,
        [request.file_id, request.requester_user_id]
      );
    }

    const updated = await pool.query(
      `UPDATE file_access_requests
       SET status = $2, updated_at = CURRENT_TIMESTAMP, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [requestId, action]
    );

    res.json({ message: `Request ${action}`, request: updated.rows[0] });
  } catch (error) {
    console.error('Resolve access request error:', error);
    sendControllerError(res, error, 'Failed to resolve access request');
  }
};

const getFileShares = async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const { fileId } = req.params;
    const { file, permission } = await getPermissionForRequest(fileId, req.user);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (!permission.canManageSharing) {
      return res.status(403).json({ message: 'Only the owner can view sharing details' });
    }

    const shares = await getSharesForOwner(fileId);
    const recentUsers = await getRecentShareTargetsForOwner(req.user.id);
    res.json({
      isPublic: file.is_public,
      publicAccessLevel: file.public_access_level,
      publicUrl: file.is_public && file.public_share_token ? `${baseUrl}/file/public/${file.public_share_token}` : null,
      privateUrl: file.share_token ? `${baseUrl}/file/private/${file.share_token}` : null,
      shares,
      recentUsers,
    });
  } catch (error) {
    console.error('Get file shares error:', error);
    sendControllerError(res, error, 'Failed to load sharing settings');
  }
};

module.exports = {
  uploadFile,
  listFiles,
  getSharedFiles,
  searchFiles,
  getPublicFiles,
  getFileDetails,
  getFileDetailsByPrivateToken,
  getFileDetailsByPublicToken,
  viewFile,
  viewFileByPrivateToken,
  viewFileByPublicToken,
  downloadFile,
  downloadFileByPrivateToken,
  downloadFileByPublicToken,
  updateFileMetadata,
  replaceFileContent,
  deleteFile,
  shareFile,
  removeShare,
  createAccessRequest,
  listAccessRequests,
  resolveAccessRequest,
  getFileShares,
};
