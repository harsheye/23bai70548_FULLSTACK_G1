import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  HiCheck,
  HiEllipsisVertical,
  HiMiniArrowDownTray,
  HiMiniArrowUpTray,
  HiMiniBars3,
  HiMiniFolder,
  HiMiniMoon,
  HiMiniPencilSquare,
  HiMiniPhoto,
  HiMiniPlay,
  HiMiniShare,
  HiMiniStar,
  HiMiniSun,
  HiMiniTrash,
  HiMiniUserCircle,
  HiOutlineDocument,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineQueueList,
  HiOutlineRectangleGroup,
  HiOutlineSquares2X2,
  HiOutlineUsers,
  HiXMark,
} from 'react-icons/hi2';
import {
  MdAccessTime,
  MdArticle,
  MdAudioFile,
  MdCalendarMonth,
  MdCalendarToday,
  MdDescription,
  MdExtension,
  MdFolderZip,
  MdImage,
  MdInsertDriveFile,
  MdMovie,
  MdMusicNote,
  MdOutlineSort,
  MdPictureAsPdf,
  MdTextSnippet,
  MdVideocam,
} from 'react-icons/md';
import { authService, fileService, userService } from '../services/api';
import FilterDropdown from '../components/FilterDropdown';
import ToastStack from '../components/ToastStack';
import VideoPlayer from '../components/VideoPlayer';
import '../styles/Dashboard.css';

const ACCESS_OPTIONS = [
  { value: 'view', label: 'View only' },
  { value: 'download', label: 'Download + view' },
  { value: 'edit', label: 'Edit access' },
];

const REQUEST_SORT_OPTIONS = [
  { value: 'created', label: 'Newest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'resolved', label: 'Recently resolved' },
];

const FILE_SORT_OPTIONS = [
  { value: 'modified-desc', label: 'Modified', icon: MdOutlineSort, colorClass: 'blue' },
  { value: 'created-desc', label: 'Recently uploaded', icon: MdCalendarToday, colorClass: 'green' },
  { value: 'name-asc', label: 'Name A-Z', icon: MdArticle, colorClass: 'purple' },
  { value: 'size-desc', label: 'Largest first', icon: MdInsertDriveFile, colorClass: 'orange' },
];

const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'All time', icon: MdAccessTime, colorClass: 'neutral' },
  { value: 'date', label: 'Today', icon: MdCalendarToday, colorClass: 'blue' },
  { value: 'month', label: 'This month', icon: MdCalendarMonth, colorClass: 'green' },
  { value: 'year', label: 'This year', icon: MdDescription, colorClass: 'purple' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types', icon: MdInsertDriveFile, colorClass: 'neutral' },
  { value: 'word', label: 'Documents', icon: MdArticle, colorClass: 'blue' },
  { value: 'pdf', label: 'PDFs', icon: MdPictureAsPdf, colorClass: 'red' },
  { value: 'txt', label: 'Text files', icon: MdTextSnippet, colorClass: 'gray' },
  { value: 'image', label: 'Photos & images', icon: MdImage, colorClass: 'orange' },
  { value: 'video', label: 'Videos', icon: MdMovie, colorClass: 'red' },
  { value: 'mp4', label: 'MP4 clips', icon: MdVideocam, colorClass: 'purple' },
  { value: 'mp3', label: 'Audio', icon: MdMusicNote, colorClass: 'pink' },
  { value: 'exe', label: 'Apps (.exe)', icon: MdExtension, colorClass: 'gray' },
  { value: 'apk', label: 'Android (.apk)', icon: MdAudioFile, colorClass: 'green' },
  { value: 'zip', label: 'Archives (.zip)', icon: MdFolderZip, colorClass: 'yellow' },
];

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: HiOutlineHome },
  { to: '/drive', label: 'My Drive', icon: HiMiniFolder },
  { to: '/shared', label: 'Shared with me', icon: HiOutlineUsers },
  { to: '/starred', label: 'Starred', icon: HiMiniStar },
  { to: '/requests', label: 'Requests', icon: HiMiniShare },
  { to: '/all-files', label: 'Recent', icon: HiOutlineQueueList },
  { to: '/explore', label: 'Public Explore', icon: HiMiniPhoto },
];

function Workspace({ mode = 'drive', onLogout, theme = 'dark', onToggleTheme }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [requestSort, setRequestSort] = useState(REQUEST_SORT_OPTIONS[0].value);
  const [fileSort, setFileSort] = useState(FILE_SORT_OPTIONS[0].value);
  const [timeFilter, setTimeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [overlayIndex, setOverlayIndex] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [sharingFile, setSharingFile] = useState(null);
  const [shareTargets, setShareTargets] = useState([]);
  const [shareSearch, setShareSearch] = useState('');
  const [shareResults, setShareResults] = useState([]);
  const [shareAccessLevel, setShareAccessLevel] = useState('view');
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [publicAccessLevel, setPublicAccessLevel] = useState('view');
  const [publicShareUrl, setPublicShareUrl] = useState('');
  const [privateShareUrl, setPrivateShareUrl] = useState('');
  const [existingShares, setExistingShares] = useState([]);
  const [recentShareUsers, setRecentShareUsers] = useState([]);
  const [editingFile, setEditingFile] = useState(null);
  const [editFileName, setEditFileName] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editPublicAccessLevel, setEditPublicAccessLevel] = useState('view');
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [requestStatus, setRequestStatus] = useState('');
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const uploadInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceFileIdRef = useRef(null);
  const menuRefs = useRef({});
  const profileRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    setTimeFilter('all');
    setTypeFilter('all');
    setFileSort(FILE_SORT_OPTIONS[0].value);
    setRequestSort(REQUEST_SORT_OPTIONS[0].value);
    setRequestStatus('');
    setMenuOpenId(null);
    setOverlayIndex(null);
  }, [mode]);

  useEffect(() => {
    const run = async () => {
      setOffset(0);
      await loadItems({ reset: true, search: query });
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, requestSort, requestStatus]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => () => {
    if (overlayUrl) {
      URL.revokeObjectURL(overlayUrl);
    }
  }, [overlayUrl]);

  useEffect(() => {
    const loadThumbnails = async () => {
      const candidates = items.filter((item) => ['image', 'video', 'pdf'].includes(item.preview_kind)).slice(0, 12);
      for (const item of candidates) {
        if (thumbnailUrls[item.id]) continue;
        try {
          const response = await fileService.viewFile(item.id);
          const objectUrl = URL.createObjectURL(response.data);
          setThumbnailUrls((current) => ({ ...current, [item.id]: objectUrl }));
        } catch (err) {
          // ignore preview thumbnail errors
        }
      }
    };

    loadThumbnails();
  }, [items, thumbnailUrls]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (menuOpenId) {
        const menuNode = menuRefs.current[menuOpenId];
        if (menuNode && !menuNode.contains(event.target)) {
          setMenuOpenId(null);
        }
      }

      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpenId, profileOpen]);

  useEffect(() => {
    if (mode === 'requests') return undefined;
    if (!loadMoreRef.current || !hasMore || loading || loadingMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadItems({ append: true, search: query });
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, loadingMore, offset, query, requestSort, mode]);

  useEffect(() => {
    if (mode === 'requests') {
      setViewMode('list');
    }
  }, [mode]);

  const pushNotification = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!error) return;
    pushNotification(error, 'error');
    setError('');
  }, [error]);

  useEffect(() => {
    if (!success) return;
    pushNotification(success, 'success');
    setSuccess('');
  }, [success]);

  const loadUser = async () => {
    try {
      const response = await authService.getProfile();
      setUser(response.data);
    } catch (err) {
      setUser(null);
    }
  };

  const loadItems = async ({ search = query, reset = false, append = false } = {}) => {
    const nextOffset = append ? offset : 0;
    const limit = mode === 'dashboard' ? 12 : 20;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError('');
    try {
      let response;
      if (mode === 'requests') {
        response = await fileService.getAccessRequests(search, requestSort, requestStatus);
        setItems(response.data || []);
        setHasMore(false);
        setOffset(0);
        return;
      }
      if (mode === 'dashboard' || mode === 'all') {
        response = await fileService.searchFiles(search, '', { offset: nextOffset, limit });
      } else if (mode === 'shared') {
        response = await fileService.getSharedFiles(search, '', { offset: nextOffset, limit });
      } else if (mode === 'starred') {
        response = await fileService.listFiles(search, '', { offset: nextOffset, limit, starred: true });
      } else {
        response = await fileService.listFiles(search, '', { offset: nextOffset, limit });
      }

      const payload = response.data?.items ? response.data : { items: response.data || [], pagination: { hasMore: false, nextOffset: null } };
      const mergedItems = append ? [...items, ...payload.items] : payload.items;
      setItems(mergedItems);
      setHasMore(Boolean(payload.pagination?.hasMore));
      setOffset(payload.pagination?.nextOffset ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || (mode === 'requests' ? 'Failed to load requests' : 'Failed to load files'));
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  const usedStorage = user?.storage_used_bytes ?? 0;
  const storageLimit = user?.storage_limit_bytes || STORAGE_LIMIT_BYTES;
  const storagePercent = Math.min(100, Math.round((usedStorage / storageLimit) * 100));
  const dailyUsageBytes = (user?.daily_upload_bytes || 0) + (user?.daily_download_bytes || 0);
  const dailyLimit = user?.daily_transfer_limit_bytes || 500 * 1024 * 1024;
  const dailyUsagePercent = Math.min(100, Math.round((dailyUsageBytes / dailyLimit) * 100));
  const navItems = user?.is_admin
    ? [...NAV_ITEMS, { to: '/admin', label: 'Admin Panel', icon: HiMiniUserCircle }]
    : NAV_ITEMS;

  const getTypeValue = (item) => {
    const mime = (item.mime_type || '').toLowerCase();
    const name = (item.display_name || item.file_name || '').toLowerCase();
    const extension = name.includes('.') ? name.split('.').pop() : '';

    if (mime.startsWith('image/')) return extension || 'image';
    if (mime.startsWith('video/')) return extension || 'video';
    if (mime.startsWith('audio/')) return extension || 'audio';
    if (mime === 'application/pdf' || extension === 'pdf') return 'pdf';
    if (mime.includes('word') || ['doc', 'docx'].includes(extension)) return 'word';
    if (mime.startsWith('text/') || extension === 'txt') return 'txt';
    if (extension === 'zip') return 'zip';
    if (extension === 'apk') return 'apk';
    if (extension === 'exe') return 'exe';
    if (extension === 'mp4') return 'mp4';
    if (extension === 'mp3') return 'mp3';
    return extension || item.preview_kind || 'file';
  };

  const visibleItems = useMemo(
    () => (
      mode === 'requests'
        ? items
        : items
          .filter((item) => {
            const value = new Date(item.last_edited_at || item.updated_at || item.created_at);
            const now = new Date();
            const timeMatches =
              timeFilter === 'all'
                ? true
                : timeFilter === 'date'
                  ? value.toDateString() === now.toDateString()
                  : timeFilter === 'month'
                    ? value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear()
                    : value.getFullYear() === now.getFullYear();

            if (!timeMatches) return false;

            if (typeFilter === 'all') return true;
            const typeValue = getTypeValue(item);
            if (typeFilter === 'image') return item.preview_kind === 'image';
            if (typeFilter === 'video') return item.preview_kind === 'video';
            return typeValue === typeFilter;
          })
          .sort((left, right) => {
            if (fileSort === 'name-asc') {
              return (left.display_name || left.file_name || '').localeCompare(right.display_name || right.file_name || '');
            }

            if (fileSort === 'size-desc') {
              return (right.file_size || 0) - (left.file_size || 0);
            }

            if (fileSort === 'created-desc') {
              return new Date(right.created_at || 0) - new Date(left.created_at || 0);
            }

            const leftValue = new Date(left.last_edited_at || left.updated_at || left.created_at || 0);
            const rightValue = new Date(right.last_edited_at || right.updated_at || right.created_at || 0);
            return rightValue - leftValue;
          })
    ),
    [items, mode, timeFilter, typeFilter, fileSort]
  );

  const mediaItems = visibleItems.filter((item) => ['image', 'video', 'pdf'].includes(item.preview_kind));
  const buildFileViewerState = (currentFile) => ({
    playlist: visibleItems.map((item) => ({
      id: item.id,
      label: item.display_name || item.file_name,
    })),
    currentId: currentFile.id,
    sourceMode: mode,
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${Math.round((bytes / 1024 ** power) * 100) / 100} ${units[power]}`;
  };

  const getItemIcon = (item) => {
    if (item.preview_kind === 'image') return <HiMiniPhoto />;
    if (item.preview_kind === 'video') return <HiMiniPlay />;
    if (item.preview_kind === 'pdf') return <HiOutlineDocument />;
    return <HiOutlineDocument />;
  };

  const formatStamp = (value) => {
    if (!value) return 'Recently';
    return new Date(value).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const primaryStamp = (file) =>
    mode === 'dashboard'
      ? file.last_edited_at || file.last_accessed_at || file.last_viewed_at || file.created_at
      : file.created_at;

  const uploadEntries = async (entries) => {
    if (!entries.length) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: entries.length, name: '' });
    setError('');
    setSuccess('');

    try {
      for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        setUploadProgress({ current: index + 1, total: entries.length, name: entry.uploadName });
        await fileService.uploadFile(entry.file, entry.uploadName);
      }
      await loadUser();
      setSuccess(entries.length === 1 ? 'Upload completed successfully' : `${entries.length} files uploaded`);
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleUpload = async (event, isFolder = false) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    await uploadEntries(
      files.map((file) => ({
        file,
        uploadName: isFolder ? file.webkitRelativePath || file.name : file.name,
      }))
    );

    event.target.value = '';
  };

  const handleDropUpload = async (event) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length || !['dashboard', 'drive'].includes(mode)) return;

    await uploadEntries(
      files.map((file) => ({
        file,
        uploadName: file.name,
      }))
    );
  };

  const handleDownload = async (file) => {
    try {
      const response = await fileService.downloadFile(file.id);
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.display_name || file.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      await loadUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Download failed');
    }
  };

  const openOverlay = async (file) => {
    if (mode === 'requests') return;
    const nextIndex = mediaItems.findIndex((item) => item.id === file.id);
    if (nextIndex === -1) {
      navigate(`/file/${file.id}`, { state: buildFileViewerState(file) });
      return;
    }
    try {
      const response = await fileService.viewFile(file.id);
      if (overlayUrl) URL.revokeObjectURL(overlayUrl);
      setOverlayUrl(URL.createObjectURL(response.data));
      setOverlayIndex(nextIndex);
    } catch (err) {
      setError(err.response?.data?.message || 'Preview failed');
    }
  };

  const moveOverlay = async (direction) => {
    if (overlayIndex === null || !mediaItems.length) return;
    const nextIndex = (overlayIndex + direction + mediaItems.length) % mediaItems.length;
    await openOverlay(mediaItems[nextIndex]);
  };

  const requestReplace = (fileId) => {
    replaceFileIdRef.current = fileId;
    replaceInputRef.current?.click();
  };

  const handleReplace = async (event) => {
    const replacement = event.target.files?.[0];
    if (!replacement || !replaceFileIdRef.current) return;
    try {
      await fileService.replaceFileContent(replaceFileIdRef.current, replacement);
      setSuccess('File replaced successfully');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Replace failed');
    } finally {
      replaceFileIdRef.current = null;
      event.target.value = '';
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await fileService.deleteFile(fileId);
      setSuccess('File deleted successfully');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleToggleStar = async (file) => {
    try {
      const response = await fileService.updateFile(file.id, {
        isStarred: !file.is_starred,
      });
      const nextFile = response.data.file;
      setItems((current) =>
        current
          .map((entry) => (entry.id === file.id ? { ...entry, ...nextFile } : entry))
          .filter((entry) => (mode === 'starred' ? entry.is_starred : true))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update star');
    }
  };

  const openShareDialog = async (file) => {
    setSharingFile(file);
    setShareTargets([]);
    setShareSearch('');
    setShareResults([]);
    const response = await fileService.getFileShares(file.id);
    setExistingShares(response.data.shares || []);
    setRecentShareUsers(response.data.recentUsers || []);
    setPublicEnabled(Boolean(response.data.isPublic));
    setPublicAccessLevel(response.data.publicAccessLevel || 'view');
    setPublicShareUrl(response.data.publicUrl || '');
    setPrivateShareUrl(response.data.privateUrl || file.private_url || '');
    setShareResults((response.data.recentUsers || []).slice(0, 5));
    setShareAccessLevel('view');
  };

  const searchUsers = async (value) => {
    setShareSearch(value);
    if (value.trim().length < 1) {
      setShareResults(recentShareUsers.slice(0, 5));
      return;
    }
    try {
      const response = await userService.searchUsers(value);
      const merged = [...response.data];
      recentShareUsers.forEach((user) => {
        if (!merged.some((entry) => entry.id === user.id) && `${user.username} ${user.email}`.toLowerCase().includes(value.toLowerCase())) {
          merged.push(user);
        }
      });
      setShareResults(merged.slice(0, 5));
    } catch {
      setShareResults([]);
    }
  };

  const addTarget = (target) => {
    if (!shareTargets.some((item) => item.id === target.id)) {
      setShareTargets([...shareTargets, target]);
    }
    setShareSearch('');
    setShareResults([]);
  };

  const removeTarget = (targetId) => {
    setShareTargets((current) => current.filter((target) => target.id !== targetId));
  };

  const saveShareSettings = async (event) => {
    event.preventDefault();
    if (!sharingFile) return;
    try {
      const response = await fileService.shareFile(sharingFile.id, {
        userIds: shareTargets.map((target) => target.id),
        accessLevel: shareAccessLevel,
        isPublic: publicEnabled,
        publicAccessLevel,
      });
      setPublicShareUrl(response.data?.publicShare?.publicUrl || '');
      setPrivateShareUrl(response.data?.privateUrl || sharingFile.private_url || privateShareUrl);
      setSuccess('Sharing updated successfully');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Share failed');
    }
  };

  const openEditDialog = (file) => {
    setEditingFile(file);
    setEditFileName(file.file_name);
    setEditIsPublic(Boolean(file.is_public));
    setEditPublicAccessLevel(file.public_access_level || 'view');
  };

  const saveEditSettings = async (event) => {
    event.preventDefault();
    if (!editingFile) return;
    try {
      await fileService.updateFile(editingFile.id, {
        fileName: editFileName,
        isPublic: editIsPublic,
        publicAccessLevel: editIsPublic ? editPublicAccessLevel : null,
      });
      setSuccess('File updated successfully');
      setEditingFile(null);
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    }
  };

  const renderPreview = () => {
    const file = mediaItems[overlayIndex];
    if (!file || !overlayUrl) return null;
    if (file.preview_kind === 'image') {
      return <img src={overlayUrl} alt={file.display_name} className="overlay-media-image" />;
    }
    if (file.preview_kind === 'video') {
      return <VideoPlayer src={overlayUrl} className="overlay-media-frame custom-overlay-player" />;
    }
    return (
      <iframe
        src={overlayUrl}
        title={file.display_name}
        className={file.preview_kind === 'pdf' ? 'overlay-media-frame overlay-media-pdf' : 'overlay-media-frame'}
      />
    );
  };

  const removeExistingShare = async (sharedUserId) => {
    if (!sharingFile) return;
    try {
      await fileService.removeShare(sharingFile.id, sharedUserId);
      const response = await fileService.getFileShares(sharingFile.id);
      setExistingShares(response.data.shares || []);
      setRecentShareUsers(response.data.recentUsers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove access');
    }
  };

  const resolveRequest = async (requestId, action) => {
    try {
      await fileService.resolveAccessRequest(requestId, action);
      setSuccess(`Request ${action}d successfully`);
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request');
    }
  };

  const overlayFile = overlayIndex !== null ? mediaItems[overlayIndex] : null;

  return (
    <div
      className={`workspace-layout ${collapsedSidebar ? 'sidebar-collapsed' : ''} ${dragActive ? 'drag-active' : ''}`}
      onDragOver={(event) => {
        if (!['dashboard', 'drive'].includes(mode)) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragActive(false);
        }
      }}
      onDrop={handleDropUpload}
    >
      <ToastStack
        notifications={notifications}
        onDismiss={(id) => setNotifications((current) => current.filter((notification) => notification.id !== id))}
      />
      <aside className="workspace-side-nav">
        <div className="sidebar-header">
          <div className="sidebar-header-main">
            {!collapsedSidebar && (
              <div className="sidebar-brand">
                <h2>{user?.username || 'Workspace'}</h2>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            onClick={() => setCollapsedSidebar((current) => !current)}
            aria-label={collapsedSidebar ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <HiMiniBars3 />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsedSidebar ? item.label : undefined}
              data-label={item.label}
              className={({ isActive }) => `nav-pill nav-tile ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><item.icon /></span>
              {!collapsedSidebar && <span className="nav-text">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-usage">
          {collapsedSidebar ? (
            <>
              <div className="circular-progress" style={{ '--progress': storagePercent }}>
                <span>{storagePercent}%</span>
              </div>
              <div className="circular-progress small" style={{ '--progress': dailyUsagePercent }}>
                <span>{dailyUsagePercent}%</span>
              </div>
            </>
          ) : (
            <>
              <div className="usage-block">
                <strong>Account storage</strong>
                <div className="storage-widget-bar">
                  <span style={{ width: `${storagePercent}%` }} />
                </div>
                <small>{formatFileSize(usedStorage)} of 1 GB used</small>
              </div>
              <div className="usage-block">
                <strong>Daily IP usage</strong>
                <div className="storage-widget-bar">
                  <span style={{ width: `${dailyUsagePercent}%` }} />
                </div>
                <small>{formatFileSize(dailyUsageBytes)} of 500 MB used today</small>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <strong>{user?.username || 'Workspace'}</strong>
          </div>
          <div className="workspace-topbar-center">
            <div className="search-shell">
              <HiOutlineMagnifyingGlass />
              <input
                type="search"
                placeholder={mode === 'requests' ? 'Search requests, files, requesters' : 'Search files, owners, types'}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                  loadItems({ reset: true, search: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="workspace-topbar-right">
            <button type="button" className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <HiMiniSun /> : <HiMiniMoon />}
            </button>
            {mode !== 'requests' && (
              <div className="view-toggle">
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><HiOutlineSquares2X2 /> Tiles</button>
                <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><HiOutlineRectangleGroup /> List</button>
              </div>
            )}
            <div className="profile-trigger" ref={profileRef}>
              <button type="button" className="profile-button" onClick={() => setProfileOpen((current) => !current)}>
                <HiMiniUserCircle />
                <span>{user?.username || 'Profile'}</span>
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-row">
                    <strong>{user?.username}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <button type="button" onClick={() => navigate('/profile')}>View profile</button>
                  {user?.is_admin && <button type="button" onClick={() => navigate('/admin')}>Admin panel</button>}
                  <button type="button" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); onLogout(); navigate('/login'); }}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-content">
          <div className="workspace-toolbar">
            <div className="workspace-toolbar-actions">
              {mode !== 'requests' && (
                <>
                  <FilterDropdown label="Time" triggerLabel="Time" value={timeFilter} options={TIME_FILTER_OPTIONS} onSelect={setTimeFilter} />
                  <FilterDropdown label="Type" triggerLabel="Type" value={typeFilter} options={TYPE_FILTER_OPTIONS} onSelect={setTypeFilter} />
                  <FilterDropdown label="Sort" triggerLabel="Sort by" value={fileSort} options={FILE_SORT_OPTIONS} onSelect={setFileSort} />
                </>
              )}
              {mode === 'requests' && (
                <div className="sort-pills" role="tablist" aria-label="Sort requests">
                  {REQUEST_SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`sort-pill ${requestSort === option.value ? 'active' : ''}`}
                      onClick={() => setRequestSort(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              {mode === 'requests' && (
                <div className="sort-pills" role="tablist" aria-label="Filter requests">
                  {['', 'pending', 'approved', 'declined'].map((option) => (
                    <button
                      key={option || 'all'}
                      type="button"
                      className={`sort-pill ${requestStatus === option ? 'active' : ''}`}
                      onClick={() => setRequestStatus(option)}
                    >
                      {option || 'All'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <input ref={uploadInputRef} type="file" multiple className="hidden-input" onChange={(e) => handleUpload(e, false)} />
          <input ref={folderInputRef} type="file" multiple className="hidden-input" onChange={(e) => handleUpload(e, true)} />
          <input ref={replaceInputRef} type="file" className="hidden-input" onChange={handleReplace} />

          {uploadProgress && (
            <div className="upload-progress-card">
              <div className="upload-progress-bar">
                <span style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
              </div>
              <small>Uploading {uploadProgress.current} / {uploadProgress.total}: {uploadProgress.name}</small>
            </div>
          )}

          {loading ? (
            <p className="empty-panel">{mode === 'requests' ? 'Loading requests...' : 'Loading files...'}</p>
          ) : visibleItems.length === 0 ? (
            <p className="empty-panel">{mode === 'requests' ? 'No access requests found.' : 'No files found for this view.'}</p>
          ) : (
            <>
              {viewMode === 'list' && mode !== 'requests' && (
                <div className="workspace-list-header">
                  <span>Name</span>
                  <span>Details</span>
                  <span>Owner</span>
                  <span />
                </div>
              )}
              <div className={viewMode === 'grid' && mode !== 'requests' ? 'workspace-file-grid' : 'workspace-file-list'}>
                {mode === 'requests' && visibleItems.map((item) => (
                  <article key={item.id} className="workspace-file-card list">
                    <div className="file-card-main request-card-main">
                      <div className="file-list-copy">
                        <strong>{item.file_name}</strong>
                        <small>{item.requester_username} • {item.requester_email}</small>
                      </div>
                      <div className="file-list-details">
                        <span>{item.status}</span>
                        <small>{new Date(item.created_at).toLocaleString()}</small>
                      </div>
                      <div className="file-actions">
                        {item.status === 'pending' ? (
                          <>
                            <button type="button" className="button button-primary" onClick={() => resolveRequest(item.id, 'approve')}><HiCheck /> Approve</button>
                            <button type="button" className="button button-secondary" onClick={() => resolveRequest(item.id, 'decline')}><HiXMark /> Decline</button>
                          </>
                        ) : (
                          <small className="request-status-label">Resolved</small>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {mode !== 'requests' && mode === 'drive' && viewMode === 'grid' && (
                  <article className="workspace-file-card grid upload-tile-card">
                    <button type="button" className="file-card-main upload-tile-main" onClick={() => setUploadPickerOpen(true)}>
                      <div className="upload-tile-visual">
                        <HiMiniArrowUpTray />
                      </div>
                      <div className="upload-tile-copy">
                        <strong>Upload files</strong>
                        <small>Choose files or a full folder</small>
                      </div>
                    </button>
                  </article>
                )}
                {mode !== 'requests' && visibleItems.map((file) => (
                  <article key={file.id} className={`workspace-file-card ${viewMode}`}>
                    <button type="button" className="file-card-main" onClick={() => openOverlay(file)}>
                      {viewMode === 'grid' ? (
                        <div className="file-grid-body">
                          <div className="file-card-header">
                            <div className="file-title-row">
                              <span className="file-type-chip">{getItemIcon(file)}</span>
                              <strong>{file.display_name || file.file_name}</strong>
                            </div>
                          </div>
                          <div className={`file-thumbnail-panel file-visual-${file.preview_kind || 'file'}`}>
                            {thumbnailUrls[file.id] ? (
                              file.preview_kind === 'video' ? (
                                <video src={thumbnailUrls[file.id]} muted className="file-thumb" />
                              ) : file.preview_kind === 'pdf' ? (
                                <iframe src={thumbnailUrls[file.id]} title={file.display_name || file.file_name} className="file-thumb-frame" />
                              ) : (
                                <img src={thumbnailUrls[file.id]} alt={file.display_name || file.file_name} className="file-thumb" />
                              )
                            ) : (
                              <div className="file-fallback-icon">{getItemIcon(file)}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="file-list-name">
                            <div className={`file-list-thumbnail file-visual-${file.preview_kind || 'file'}`}>
                              {thumbnailUrls[file.id] ? (
                                file.preview_kind === 'video' ? (
                                  <video src={thumbnailUrls[file.id]} muted className="file-thumb" />
                                ) : file.preview_kind === 'pdf' ? (
                                  <iframe src={thumbnailUrls[file.id]} title={file.display_name || file.file_name} className="file-thumb-frame" />
                                ) : (
                                  <img src={thumbnailUrls[file.id]} alt={file.display_name || file.file_name} className="file-thumb" />
                                )
                              ) : (
                                <div className="file-fallback-icon">{getItemIcon(file)}</div>
                              )}
                            </div>
                            <div className="file-list-copy">
                              <strong>{file.display_name || file.file_name}</strong>
                              <small>{file.mime_type || 'File'}</small>
                            </div>
                          </div>
                          <div className="file-list-details">
                            <span>{file.user_id === user?.id ? 'You created' : 'Shared with you'}</span>
                            <small>{formatStamp(primaryStamp(file))}</small>
                          </div>
                          <div className="file-list-owner">
                            <HiMiniUserCircle />
                            <span>{file.user_id === user?.id ? 'me' : file.owner_username || file.shared_by_user || 'guest'}</span>
                          </div>
                        </>
                      )}
                    </button>

                    <div className="file-menu-wrap" ref={(element) => { menuRefs.current[file.id] = element; }}>
                      <button
                        type="button"
                        className="file-menu-trigger"
                        onClick={() => setMenuOpenId((current) => (current === file.id ? null : file.id))}
                      >
                        <HiEllipsisVertical />
                      </button>
                      {menuOpenId === file.id && (
                        <div className="file-menu-dropdown">
                          <button type="button" onClick={() => openOverlay(file)}><HiMiniPhoto /> Open</button>
                          <button type="button" onClick={() => handleToggleStar(file)}><HiMiniStar /> {file.is_starred ? 'Unstar' : 'Star'}</button>
                          {file.permission?.canDownload && (
                            <button type="button" onClick={() => handleDownload(file)}><HiMiniArrowDownTray /> Download</button>
                          )}
                          {(file.permission?.canEdit || file.user_id === user?.id) && (
                            <>
                              <button type="button" onClick={() => openEditDialog(file)}><HiMiniPencilSquare /> Rename</button>
                              <button type="button" onClick={() => requestReplace(file.id)}><HiMiniArrowUpTray /> Replace</button>
                            </>
                          )}
                          {file.user_id === user?.id && (
                            <button type="button" onClick={() => openShareDialog(file)}><HiMiniShare /> Share</button>
                          )}
                          <div className="file-menu-details">
                            <small>Type: {file.mime_type || 'Unknown'}</small>
                            <small>Size: {formatFileSize(file.file_size)}</small>
                          </div>
                          {file.permission?.canDelete && (
                            <button type="button" className="danger" onClick={() => handleDelete(file.id)}><HiMiniTrash /> Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {hasMore && <div ref={loadMoreRef} className="scroll-sentinel">{loadingMore ? 'Loading more files...' : ''}</div>}
            </>
          )}
        </div>

        {dragActive && ['dashboard', 'drive'].includes(mode) && (
          <div className="drag-overlay">
            <div className="drag-overlay-card">
              <HiMiniArrowUpTray />
              <strong>Drop files to upload</strong>
              <span>Upload into your drive without leaving this page.</span>
            </div>
          </div>
        )}

        {overlayIndex !== null && (
          <div className="overlay-viewer" onClick={() => setOverlayIndex(null)}>
            <button type="button" className="overlay-nav left" onClick={(e) => { e.stopPropagation(); moveOverlay(-1); }}>&lt;</button>
            <div className={`overlay-body overlay-with-meta ${['pdf', 'video'].includes(overlayFile?.preview_kind) ? 'overlay-with-meta-wide' : ''}`.trim()} onClick={(e) => e.stopPropagation()}>
              <div className="overlay-preview-panel">
                {renderPreview()}
              </div>
              {overlayFile && (
                <aside className="overlay-meta-panel">
                  <div className="overlay-meta-top">
                    <h3>{overlayFile.display_name || overlayFile.file_name}</h3>
                    <div className="file-menu-wrap" ref={(element) => { menuRefs.current[`overlay-${overlayFile.id}`] = element; }}>
                      <button
                        type="button"
                        className="file-menu-trigger"
                        onClick={() => setMenuOpenId((current) => (current === `overlay-${overlayFile.id}` ? null : `overlay-${overlayFile.id}`))}
                      >
                        <HiEllipsisVertical />
                      </button>
                      {menuOpenId === `overlay-${overlayFile.id}` && (
                        <div className="file-menu-dropdown">
                          <button type="button" onClick={() => handleToggleStar(overlayFile)}><HiMiniStar /> {overlayFile.is_starred ? 'Unstar' : 'Star'}</button>
                          {overlayFile.permission?.canDownload && (
                            <button type="button" onClick={() => handleDownload(overlayFile)}><HiMiniArrowDownTray /> Download</button>
                          )}
                          {(overlayFile.permission?.canEdit || overlayFile.user_id === user?.id) && (
                            <button type="button" onClick={() => openEditDialog(overlayFile)}><HiMiniPencilSquare /> Rename</button>
                          )}
                          {overlayFile.user_id === user?.id && (
                            <button type="button" onClick={() => openShareDialog(overlayFile)}><HiMiniShare /> Share</button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p><strong>Type:</strong> {overlayFile.mime_type || 'Unknown'}</p>
                  <p><strong>Owner:</strong> {overlayFile.owner_username || overlayFile.shared_by_user || user?.username || 'Unknown'}</p>
                  <p><strong>Uploaded:</strong> {new Date(overlayFile.created_at).toLocaleString()}</p>
                  <p><strong>Link:</strong> {overlayFile.public_url || overlayFile.private_url || 'Available in share menu'}</p>
                </aside>
              )}
            </div>
            <button type="button" className="overlay-nav right" onClick={(e) => { e.stopPropagation(); moveOverlay(1); }}>&gt;</button>
            <button type="button" className="overlay-close" onClick={() => setOverlayIndex(null)}>Close</button>
          </div>
        )}

        {sharingFile && (
          <div className="modal-overlay" onClick={() => setSharingFile(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Share {sharingFile.display_name || sharingFile.file_name}</h2>
              <form onSubmit={saveShareSettings}>
                <div className="input-group">
                  <label htmlFor="shareSearch">Search users</label>
                  <input
                    id="shareSearch"
                    type="text"
                    value={shareSearch}
                    onFocus={() => {
                      if (!shareSearch.trim()) {
                        setShareResults(recentShareUsers.slice(0, 5));
                      }
                    }}
                    onChange={(e) => searchUsers(e.target.value)}
                  />
                </div>
                {shareResults.length > 0 && (
                  <div className="search-results">
                    {shareResults.map((result) => (
                      <button key={result.id} type="button" className="result-pill" onClick={() => addTarget(result)}>
                        {result.username} • {result.email}
                      </button>
                    ))}
                  </div>
                )}
                <div className="selected-users">
                  {shareTargets.map((target) => (
                    <span key={target.id} className="selected-user-chip">
                      <span>{target.username}</span>
                      <button type="button" onClick={() => removeTarget(target.id)} aria-label={`Remove ${target.username}`}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {!shareSearch && recentShareUsers.length > 0 && (
                  <div className="existing-shares">
                    {recentShareUsers.slice(0, 5).map((userEntry) => (
                      <button key={userEntry.id} type="button" className="result-pill" onClick={() => addTarget(userEntry)}>
                        {userEntry.username} • {userEntry.email}
                      </button>
                    ))}
                  </div>
                )}
                <div className="input-group">
                  <label htmlFor="shareAccess">Access level</label>
                  <select id="shareAccess" value={shareAccessLevel} onChange={(e) => setShareAccessLevel(e.target.value)}>
                    {ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="privateUrl">Private link</label>
                  <div className="public-link-row">
                    <input id="privateUrl" type="text" readOnly value={privateShareUrl || sharingFile.private_url || ''} />
                    <button type="button" className="button button-secondary" onClick={() => navigator.clipboard?.writeText(privateShareUrl || sharingFile.private_url || '')}>
                      Copy
                    </button>
                  </div>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" checked={publicEnabled} onChange={(e) => setPublicEnabled(e.target.checked)} />
                  <span>Enable public share</span>
                </label>
                {publicEnabled && (
                  <>
                    <div className="input-group">
                      <label htmlFor="publicAccess">Public access</label>
                      <select id="publicAccess" value={publicAccessLevel} onChange={(e) => setPublicAccessLevel(e.target.value)}>
                        {ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label htmlFor="publicUrl">Public link</label>
                      <div className="public-link-row">
                        <input
                          id="publicUrl"
                          type="text"
                          readOnly
                          value={publicShareUrl || ''}
                        />
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => navigator.clipboard?.writeText(publicShareUrl || '')}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {existingShares.length > 0 && (
                  <div className="existing-shares">
                    {existingShares.map((share) => (
                      <div key={share.id} className="existing-share-item">
                        <span>{share.username} • {share.access_level}</span>
                        <button type="button" className="share-remove-button" onClick={() => removeExistingShare(share.shared_with_user_id)}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="file-actions">
                  <button type="submit" className="button button-primary">Save</button>
                  <button type="button" className="button button-secondary" onClick={() => setSharingFile(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingFile && (
          <div className="modal-overlay" onClick={() => setEditingFile(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Edit file</h2>
              <form onSubmit={saveEditSettings}>
                <div className="input-group">
                  <label htmlFor="editName">File name</label>
                  <input id="editName" type="text" value={editFileName} onChange={(e) => setEditFileName(e.target.value)} />
                </div>
                <label className="toggle-row">
                  <input type="checkbox" checked={editIsPublic} onChange={(e) => setEditIsPublic(e.target.checked)} />
                  <span>Public file</span>
                </label>
                {editIsPublic && (
                  <div className="input-group">
                    <label htmlFor="editPublicAccess">Public access</label>
                    <select id="editPublicAccess" value={editPublicAccessLevel} onChange={(e) => setEditPublicAccessLevel(e.target.value)}>
                      {ACCESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="file-actions">
                  <button type="submit" className="button button-primary">Save</button>
                  <button type="button" className="button button-secondary" onClick={() => setEditingFile(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {uploadPickerOpen && (
          <div className="modal-overlay" onClick={() => setUploadPickerOpen(false)}>
            <div className="modal upload-picker-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Upload to My Drive</h2>
              <div className="upload-picker-actions">
                <button type="button" className="button button-primary" onClick={() => { setUploadPickerOpen(false); uploadInputRef.current?.click(); }}>
                  <HiMiniArrowUpTray /> Pick files
                </button>
                <button type="button" className="button button-secondary" onClick={() => { setUploadPickerOpen(false); folderInputRef.current?.click(); }}>
                  <HiMiniFolder /> Pick folder
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Workspace;
