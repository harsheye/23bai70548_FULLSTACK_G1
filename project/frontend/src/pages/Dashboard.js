import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, fileService, userService } from '../services/api';
import '../styles/Dashboard.css';

const ACCESS_OPTIONS = [
  { value: 'view', label: 'View only' },
  { value: 'download', label: 'Download + view' },
  { value: 'edit', label: 'Edit access' },
];

function Dashboard({ mode = 'drive', onLogout }) {
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(mode);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [shareTargets, setShareTargets] = useState([]);
  const [shareAccessLevel, setShareAccessLevel] = useState('view');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [publicAccessLevel, setPublicAccessLevel] = useState('view');
  const [existingShares, setExistingShares] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editFileName, setEditFileName] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editPublicAccessLevel, setEditPublicAccessLevel] = useState('view');
  const [currentPath, setCurrentPath] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);

  useEffect(() => {
    loadUserData();
    loadFiles();
  }, []);

  useEffect(() => {
    setTab(mode);
  }, [mode]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const loadUserData = async () => {
    try {
      const response = await authService.getProfile();
      setUser(response.data);
    } catch (err) {
      console.error('Failed to load user data');
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const [myFilesRes, sharedFilesRes] = await Promise.all([
        fileService.listFiles(),
        fileService.getSharedFiles()
      ]);
      setFiles(myFilesRes.data);
      setSharedFiles(sharedFilesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const uploadEntries = async (entries) => {
    if (!entries.length) return;

    setLoading(true);
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        setUploadProgress({
          current: index + 1,
          total: entries.length,
          name: entry.uploadName,
        });
        await fileService.uploadFile(entry.file, entry.uploadName);
      }

      setSuccess(
        entries.length === 1
          ? `Uploaded "${entries[0].uploadName}" successfully`
          : `Uploaded ${entries.length} items successfully`
      );
      await loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadProgress(null);
      setUploading(false);
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    await uploadEntries(
      selectedFiles.map((file) => ({
        file,
        uploadName: file.name,
      }))
    );

    e.target.value = '';
  };

  const handleFolderUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    await uploadEntries(
      selectedFiles.map((file) => ({
        file,
        uploadName: file.webkitRelativePath || file.name,
      }))
    );

    e.target.value = '';
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await fileService.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Download failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await fileService.deleteFile(fileId);
        setSuccess('File deleted successfully');
        await loadFiles();
      } catch (err) {
        setError(err.response?.data?.message || 'Delete failed');
      }
    }
  };

  const openEditModal = (file) => {
    setEditingFile(file);
    setEditFileName(file.file_name);
    setEditIsPublic(Boolean(file.is_public));
    setEditPublicAccessLevel(file.public_access_level || 'view');
    setEditModalOpen(true);
  };

  const saveFileSettings = async (e) => {
    e.preventDefault();
    if (!editingFile) return;

    try {
      await fileService.updateFile(editingFile.id, {
        fileName: editFileName,
        isPublic: editIsPublic,
        publicAccessLevel: editIsPublic ? editPublicAccessLevel : null,
      });
      setSuccess('File settings updated successfully');
      setEditModalOpen(false);
      setEditingFile(null);
      await loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update file');
    }
  };

  const requestReplace = (fileId) => {
    replaceTargetRef.current = fileId;
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e) => {
    const replacement = e.target.files?.[0];
    if (!replacement || !replaceTargetRef.current) return;

    try {
      await fileService.replaceFileContent(replaceTargetRef.current, replacement);
      setSuccess('File content updated successfully');
      await loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to replace file');
    } finally {
      replaceTargetRef.current = null;
      e.target.value = '';
    }
  };

  const openShareModal = async (file) => {
    setSelectedFile(file);
    setShareModalOpen(true);
    setShareTargets([]);
    setShareAccessLevel('view');
    setUserSearchQuery('');
    setUserSearchResults([]);

    try {
      const response = await fileService.getFileShares(file.id);
      setExistingShares(response.data.shares || []);
      setPublicEnabled(Boolean(response.data.isPublic));
      setPublicAccessLevel(response.data.publicAccessLevel || 'view');
    } catch (err) {
      setExistingShares([]);
      setPublicEnabled(Boolean(file.is_public));
      setPublicAccessLevel(file.public_access_level || 'view');
    }
  };

  const handleUserSearch = async (value) => {
    setUserSearchQuery(value);

    if (value.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    try {
      const response = await userService.searchUsers(value);
      setUserSearchResults(response.data);
    } catch (err) {
      setUserSearchResults([]);
    }
  };

  const addShareTarget = (target) => {
    if (shareTargets.some((item) => item.id === target.id)) {
      return;
    }

    setShareTargets([...shareTargets, target]);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const removeShareTarget = (targetId) => {
    setShareTargets(shareTargets.filter((target) => target.id !== targetId));
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      await fileService.shareFile(selectedFile.id, {
        userIds: shareTargets.map((target) => target.id),
        accessLevel: shareAccessLevel,
        isPublic: publicEnabled,
        publicAccessLevel,
      });
      setSuccess('Sharing settings updated successfully');
      setShareModalOpen(false);
      setSelectedFile(null);
      await loadFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Share failed');
    }
  };

  const handleRemoveShare = async (sharedUserId) => {
    if (!selectedFile) return;

    try {
      await fileService.removeShare(selectedFile.id, sharedUserId);
      const response = await fileService.getFileShares(selectedFile.id);
      setExistingShares(response.data.shares || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove share');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  const getPathSegments = (value) => value.split('/').filter(Boolean);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFiles = useMemo(
    () =>
      files.filter((file) =>
        `${file.file_name} ${file.mime_type || ''}`.toLowerCase().includes(normalizedQuery)
      ),
    [files, normalizedQuery]
  );
  const filteredSharedFiles = useMemo(
    () =>
      sharedFiles.filter((file) =>
        `${file.file_name} ${file.shared_by_user || ''} ${file.mime_type || ''}`
          .toLowerCase()
          .includes(normalizedQuery)
      ),
    [sharedFiles, normalizedQuery]
  );

  const driveData = useMemo(() => {
    const folders = new Map();
    const directFiles = [];

    const sourceFiles = tab === 'drive' ? filteredFiles : filteredSharedFiles;

    sourceFiles.forEach((file) => {
      const segments = getPathSegments(file.file_name);
      const activeDepth = currentPath.length;
      const inCurrentFolder = currentPath.every((segment, index) => segments[index] === segment);

      if (!inCurrentFolder || segments.length < activeDepth + 1) {
        return;
      }

      if (segments.length === activeDepth + 1) {
        directFiles.push({
          ...file,
          displayName: segments[segments.length - 1],
        });
        return;
      }

      const folderName = segments[activeDepth];
      const existing = folders.get(folderName) || { name: folderName, fileCount: 0, totalSize: 0 };
      existing.fileCount += 1;
      existing.totalSize += Number(file.file_size || 0);
      folders.set(folderName, existing);
    });

    return {
      folders: Array.from(folders.values()).sort((a, b) => a.name.localeCompare(b.name)),
      files: directFiles.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  }, [filteredFiles, filteredSharedFiles, currentPath, tab]);

  const storageStats = useMemo(() => {
    const sourceFiles = tab === 'drive' ? filteredFiles : filteredSharedFiles;
    const totalFiles = sourceFiles.length;
    const totalFolders = new Set(
      sourceFiles.flatMap((file) => {
        const segments = getPathSegments(file.file_name);
        return segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
      })
    ).size;
    const totalSize = sourceFiles.reduce((sum, file) => sum + Number(file.file_size || 0), 0);

    return { totalFiles, totalFolders, totalSize };
  }, [filteredFiles, filteredSharedFiles, tab]);

  const breadcrumbs = ['Drive', ...currentPath];

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-copy">
          <p className="eyebrow">Admin workspace</p>
          <h1>Drive Control Center</h1>
          <p className="subtitle">
            {user ? `Signed in as ${user.username}` : 'Manage uploads, folders, and shared items'}
          </p>
        </div>

        <div className="header-actions">
          <div className="search-wrap">
            <input
              type="search"
              placeholder="Search files, folders, owners"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="segmented-control">
            <button
              type="button"
              className={`segment ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Tiles
            </button>
            <button
              type="button"
              className={`segment ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Upload files
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={() => folderInputRef.current?.click()}
            disabled={uploading}
          >
            Upload folder
          </button>
          <button onClick={handleLogout} className="button button-danger">
            Logout
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden-input"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFolderUpload}
        className="hidden-input"
      />
      <input
        ref={replaceInputRef}
        type="file"
        onChange={handleReplaceFile}
        className="hidden-input"
      />

      <div className="dashboard-content">
        <section className="overview-grid">
          <article className="overview-card">
            <span>Total files</span>
            <strong>{storageStats.totalFiles}</strong>
            <small>Across your personal drive</small>
          </article>
          <article className="overview-card">
            <span>Folders</span>
            <strong>{storageStats.totalFolders}</strong>
            <small>Derived from uploaded paths</small>
          </article>
          <article className="overview-card">
            <span>Storage used</span>
            <strong>{formatFileSize(storageStats.totalSize)}</strong>
            <small>All uploaded content</small>
          </article>
        </section>

        <section className="toolbar-card">
          <div>
            <p className="toolbar-label">Current location</p>
            <div className="breadcrumbs">
              {breadcrumbs.map((segment, index) => (
                <button
                  key={`${segment}-${index}`}
                  type="button"
                  className={`crumb ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPath(index === 0 ? [] : currentPath.slice(0, index))}
                >
                  {segment}
                </button>
              ))}
            </div>
          </div>
          <div className="upload-note">
            <strong>Upload mode</strong>
            <span>
              Multi-file selection is enabled, and folder uploads preserve relative paths in the
              drive view.
            </span>
          </div>
        </section>

        {uploadProgress && (
          <div className="alert alert-info">
            Uploading {uploadProgress.current} of {uploadProgress.total}: {uploadProgress.name}
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab-button ${tab === 'drive' ? 'active' : ''}`}
            onClick={() => {
              setTab('drive');
              navigate('/drive');
            }}
          >
            My drive
          </button>
          <button
            className={`tab-button ${tab === 'shared' ? 'active' : ''}`}
            onClick={() => {
              setTab('shared');
              navigate('/shared');
            }}
          >
            Shared with Me
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {tab === 'drive' && (
          <div className="tab-content">
            <div className="files-section">
              <div className="section-heading">
                <div>
                  <h2>Workspace browser</h2>
                  <p>Browse folders, manage files, and share assets from one place.</p>
                </div>
                {currentPath.length > 0 && (
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => setCurrentPath(currentPath.slice(0, -1))}
                  >
                    Up one level
                  </button>
                )}
              </div>

              {loading ? (
                <p className="empty-panel">Loading drive...</p>
              ) : driveData.folders.length === 0 && driveData.files.length === 0 ? (
                <p className="empty-panel">
                  This folder is empty. Upload files or a full folder to start organizing content.
                </p>
              ) : (
                <div className={viewMode === 'grid' ? 'drive-grid' : 'drive-list'}>
                  {driveData.folders.map((folder) => (
                    <button
                      key={folder.name}
                      type="button"
                      className={`drive-card folder-card ${viewMode === 'list' ? 'list-mode' : ''}`}
                      onClick={() => setCurrentPath([...currentPath, folder.name])}
                    >
                      <div className="drive-card-top">
                        <span className="drive-badge">Folder</span>
                        <strong>{folder.name}</strong>
                      </div>
                      <p>{folder.fileCount} items</p>
                      <small>{formatFileSize(folder.totalSize)}</small>
                    </button>
                  ))}

                  {driveData.files.map((file) => (
                    <article
                      key={file.id}
                      className={`drive-card file-card ${viewMode === 'list' ? 'list-mode' : ''}`}
                    >
                      <div className="drive-card-top">
                        <span className="drive-badge">{file.preview_kind || 'file'}</span>
                        <strong title={file.displayName}>{file.displayName}</strong>
                      </div>
                      <p>
                        {formatFileSize(file.file_size)}
                        {file.permission?.role === 'shared' && file.shared_by_user
                          ? ` • from ${file.shared_by_user}`
                          : ''}
                      </p>
                      <small>Uploaded {new Date(file.created_at).toLocaleDateString()}</small>
                      <div className="file-actions">
                        <button
                          onClick={() => navigate(`/file/${file.id}`)}
                          className="button button-primary"
                        >
                          Open
                        </button>
                        {file.permission?.canDownload !== false && (
                          <button
                            onClick={() => handleDownload(file.id, file.displayName)}
                            className="button button-secondary"
                          >
                            Download
                          </button>
                        )}
                        {tab === 'drive' && (
                          <button
                            onClick={() => openShareModal(file)}
                            className="button button-secondary"
                          >
                            Share
                          </button>
                        )}
                        {(file.permission?.canEdit || tab === 'drive') && (
                          <button
                            onClick={() => openEditModal(file)}
                            className="button button-secondary"
                          >
                            Rename
                          </button>
                        )}
                        {(file.permission?.canEdit || tab === 'drive') && (
                          <button
                            onClick={() => requestReplace(file.id)}
                            className="button button-secondary"
                          >
                            Replace
                          </button>
                        )}
                        {(file.permission?.canDelete || tab === 'drive') && (
                          <button
                            onClick={() => handleDelete(file.id)}
                            className="button button-danger"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'shared' && (
          <div className="tab-content">
            <div className="files-section">
              <div className="section-heading">
                <div>
                  <h2>Shared with me</h2>
                  <p>Quick access to content that other users have granted to your account.</p>
                </div>
              </div>

              {loading ? (
                <p className="empty-panel">Loading shared files...</p>
              ) : sharedFiles.length === 0 ? (
                <p className="empty-panel">No files have been shared with you yet.</p>
              ) : (
                <div className={viewMode === 'grid' ? 'drive-grid' : 'drive-list'}>
                  {driveData.folders.map((folder) => (
                    <button
                      key={folder.name}
                      type="button"
                      className={`drive-card folder-card ${viewMode === 'list' ? 'list-mode' : ''}`}
                      onClick={() => setCurrentPath([...currentPath, folder.name])}
                    >
                      <div className="drive-card-top">
                        <span className="drive-badge">folder</span>
                        <strong>{folder.name}</strong>
                      </div>
                      <p>{folder.fileCount} items</p>
                      <small>{formatFileSize(folder.totalSize)}</small>
                    </button>
                  ))}

                  {driveData.files.map((file) => (
                    <article
                      key={file.id}
                      className={`drive-card file-card ${viewMode === 'list' ? 'list-mode' : ''}`}
                    >
                      <div className="drive-card-top">
                        <span className="drive-badge">{file.preview_kind || 'file'}</span>
                        <strong>{file.displayName}</strong>
                      </div>
                      <p>{file.shared_by_user ? `Shared by ${file.shared_by_user}` : 'Shared file'}</p>
                      <small>{new Date(file.created_at).toLocaleDateString()}</small>
                      <div className="file-actions">
                        <button
                          onClick={() => navigate(`/file/${file.id}`)}
                          className="button button-primary"
                        >
                          Open
                        </button>
                        {file.permission?.canDownload && (
                          <button
                            onClick={() => handleDownload(file.id, file.file_name)}
                            className="button button-secondary"
                          >
                            Download
                          </button>
                        )}
                        {file.permission?.canEdit && (
                          <>
                            <button
                              onClick={() => openEditModal(file)}
                              className="button button-secondary"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => requestReplace(file.id)}
                              className="button button-secondary"
                            >
                              Replace
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {shareModalOpen && (
        <div className="modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Share File</h2>
            <form onSubmit={handleShare}>
              <div className="input-group">
                <label htmlFor="shareSearch">Search users</label>
                <input
                  id="shareSearch"
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Search by username or email"
                />
              </div>

              {userSearchResults.length > 0 && (
                <div className="search-results">
                  {userSearchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="result-pill"
                      onClick={() => addShareTarget(result)}
                    >
                      {result.username} • {result.email}
                    </button>
                  ))}
                </div>
              )}

              <div className="selected-users">
                {shareTargets.map((target) => (
                  <span key={target.id} className="selected-user-chip">
                    {target.username}
                    <button type="button" onClick={() => removeShareTarget(target.id)}>
                      x
                    </button>
                  </span>
                ))}
              </div>

              <div className="input-group">
                <label htmlFor="shareAccessLevel">User access level</label>
                <select
                  id="shareAccessLevel"
                  value={shareAccessLevel}
                  onChange={(e) => setShareAccessLevel(e.target.value)}
                >
                  {ACCESS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={publicEnabled}
                  onChange={(e) => setPublicEnabled(e.target.checked)}
                />
                <span>Public share enabled</span>
              </label>

              {publicEnabled && (
                <div className="input-group">
                  <label htmlFor="publicAccessLevel">Public access level</label>
                  <select
                    id="publicAccessLevel"
                    value={publicAccessLevel}
                    onChange={(e) => setPublicAccessLevel(e.target.value)}
                  >
                    {ACCESS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {existingShares.length > 0 && (
                <div className="existing-shares">
                  <h3>Existing shares</h3>
                  {existingShares.map((share) => (
                    <div key={share.id} className="existing-share-item">
                      <span>
                        {share.username} • {share.access_level}
                      </span>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => handleRemoveShare(share.shared_with_user_id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="file-actions">
                <button type="submit" className="button button-primary">
                  Save sharing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareModalOpen(false);
                  }}
                  className="button button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit file</h2>
            <form onSubmit={saveFileSettings}>
              <div className="input-group">
                <label htmlFor="editFileName">File name</label>
                <input
                  id="editFileName"
                  type="text"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                />
              </div>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                />
                <span>Make file public</span>
              </label>

              {editIsPublic && (
                <div className="input-group">
                  <label htmlFor="editPublicAccessLevel">Public access level</label>
                  <select
                    id="editPublicAccessLevel"
                    value={editPublicAccessLevel}
                    onChange={(e) => setEditPublicAccessLevel(e.target.value)}
                  >
                    {ACCESS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="file-actions">
                <button type="submit" className="button button-primary">
                  Save changes
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
