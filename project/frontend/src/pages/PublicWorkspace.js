import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  HiEllipsisVertical,
  HiMiniArrowDownTray,
  HiMiniBars3,
  HiMiniFolder,
  HiMiniMoon,
  HiMiniPhoto,
  HiMiniPlay,
  HiMiniSun,
  HiMiniUserCircle,
  HiOutlineDocument,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineQueueList,
  HiOutlineRectangleGroup,
  HiOutlineSquares2X2,
  HiOutlineUsers,
} from 'react-icons/hi2';
import { fileService } from '../services/api';
import VideoPlayer from '../components/VideoPlayer';
import ToastStack from '../components/ToastStack';
import '../styles/Dashboard.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { to: '/drive', label: 'My Drive', icon: HiMiniFolder },
  { to: '/shared', label: 'Shared Files', icon: HiOutlineUsers },
  { to: '/all-files', label: 'All Files', icon: HiOutlineQueueList },
  { to: '/explore', label: 'Public Explore', icon: HiMiniPhoto },
];

function PublicWorkspace({ isAuthenticated, onLogout, theme = 'dark', onToggleTheme }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlayIndex, setOverlayIndex] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const menuRefs = useRef({});

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

  useEffect(() => () => {
    if (overlayUrl) {
      URL.revokeObjectURL(overlayUrl);
    }
  }, [overlayUrl]);

  useEffect(() => {
    loadFiles('');
  }, []);

  useEffect(() => {
    const loadThumbnails = async () => {
      const candidates = results.filter((item) => ['image', 'video', 'pdf'].includes(item.preview_kind)).slice(0, 12);
      for (const item of candidates) {
        if (thumbnailUrls[item.id]) continue;
        try {
          const response = await fileService.viewFile(item.id);
          const objectUrl = URL.createObjectURL(response.data);
          setThumbnailUrls((current) => ({ ...current, [item.id]: objectUrl }));
        } catch (err) {
          // ignore thumbnail errors
        }
      }
    };

    loadThumbnails();
  }, [results, thumbnailUrls]);

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

  const loadFiles = async (nextQuery) => {
    setLoading(true);
    setError('');
    try {
      const response = await fileService.getPublicFiles(nextQuery);
      setResults(response.data?.items || response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load public files');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setQuery(value);
    await loadFiles(value);
  };

  const handleDownload = async (file) => {
    try {
      const response = await fileService.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.display_name || file.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Download failed');
    }
  };

  const formatStamp = (value) =>
    new Date(value).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const getItemIcon = (item) => {
    if (item.preview_kind === 'image') return <HiMiniPhoto />;
    if (item.preview_kind === 'video') return <HiMiniPlay />;
    return <HiOutlineDocument />;
  };

  const visibleItems = useMemo(() => results, [results]);
  const mediaItems = visibleItems.filter((item) => ['image', 'video', 'pdf'].includes(item.preview_kind));
  const buildFileViewerState = (currentFile) => ({
    playlist: visibleItems.map((item) => ({
      id: item.id,
      label: item.display_name || item.file_name,
    })),
    currentId: currentFile.id,
    sourceMode: 'explore',
  });

  const openOverlay = async (file) => {
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
        title={file.display_name}
        src={overlayUrl}
        className={file.preview_kind === 'pdf' ? 'overlay-media-frame overlay-media-pdf' : 'overlay-media-frame'}
      />
    );
  };

  return (
    <div className={`workspace-layout ${collapsedSidebar ? 'sidebar-collapsed' : ''}`}>
      <ToastStack
        notifications={notifications}
        onDismiss={(id) => setNotifications((current) => current.filter((notification) => notification.id !== id))}
      />
      <aside className="workspace-side-nav">
        <div className="sidebar-header">
          <div className="sidebar-header-main">
            {!collapsedSidebar && (
              <div className="sidebar-brand">
                <h2>{isAuthenticated ? 'Public Explore' : 'Guest Explore'}</h2>
              </div>
            )}
          </div>
          <button type="button" className="sidebar-collapse-button" onClick={() => setCollapsedSidebar((current) => !current)}>
            <HiMiniBars3 />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
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

        <div className="sidebar-usage sidebar-public-note">
          {collapsedSidebar ? (
            <div className="circular-progress small" style={{ '--progress': 100 }}>
              <span>pub</span>
            </div>
          ) : (
            <div className="usage-block">
              <strong>Public library</strong>
              <div className="storage-widget-bar">
                <span style={{ width: '100%' }} />
              </div>
              <small>Guest search stays separate from your personal drive search.</small>
            </div>
          )}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <strong>Public Explore</strong>
          </div>
          <div className="workspace-topbar-center">
            <div className="search-shell">
              <HiOutlineMagnifyingGlass />
              <input
                type="search"
                placeholder="Search public files"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="workspace-topbar-right">
            <button type="button" className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <HiMiniSun /> : <HiMiniMoon />}
            </button>
            <div className="view-toggle">
              <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><HiOutlineSquares2X2 /> Tiles</button>
              <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><HiOutlineRectangleGroup /> List</button>
            </div>
            <div className="profile-trigger" ref={profileRef}>
              <button type="button" className="profile-button" onClick={() => setProfileOpen((current) => !current)}>
                <HiMiniUserCircle />
                <span>{isAuthenticated ? 'Workspace' : 'Guest'}</span>
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-menu-row">
                    <strong>{isAuthenticated ? 'Signed in' : 'Guest mode'}</strong>
                    <span>{isAuthenticated ? 'Open your private drive or sign out.' : 'Browse public files or sign in for your own drive.'}</span>
                  </div>
                  {isAuthenticated ? (
                    <>
                      <button type="button" onClick={() => navigate('/profile')}>Profile</button>
                      <button type="button" onClick={() => navigate('/drive')}>Go to Drive</button>
                      <button type="button" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); onLogout(); navigate('/login'); }}>Logout</button>
                    </>
                  ) : (
                    <>
                      <Link className="profile-link-button" to="/login">Login</Link>
                      <Link className="profile-link-button" to="/register">Register</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="workspace-content">
          {loading ? (
            <p className="empty-panel">Loading public files...</p>
          ) : visibleItems.length === 0 ? (
            <p className="empty-panel">No public files matched your search.</p>
          ) : (
            <>
              {viewMode === 'list' && (
                <div className="workspace-list-header">
                  <span>Name</span>
                  <span>Details</span>
                  <span>Owner</span>
                  <span />
                </div>
              )}
              <div className={viewMode === 'grid' ? 'workspace-file-grid' : 'workspace-file-list'}>
                {visibleItems.map((file) => (
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
                            <span>{file.path || 'Public library'}</span>
                            <small>{formatStamp(file.created_at)}</small>
                          </div>
                          <div className="file-list-owner">
                            <HiMiniUserCircle />
                            <span>{file.owner_username || 'guest'}</span>
                          </div>
                        </>
                      )}
                    </button>

                    <div className="file-menu-wrap" ref={(element) => { menuRefs.current[file.id] = element; }}>
                      <button type="button" className="file-menu-trigger" onClick={() => setMenuOpenId((current) => (current === file.id ? null : file.id))}>
                        <HiEllipsisVertical />
                      </button>
                      {menuOpenId === file.id && (
                        <div className="file-menu-dropdown">
                          <button type="button" onClick={() => openOverlay(file)}><HiMiniPhoto /> Open</button>
                          {file.permission?.canDownload && (
                            <button type="button" onClick={() => handleDownload(file)}><HiMiniArrowDownTray /> Download</button>
                          )}
                          <div className="file-menu-details">
                            <small>Type: {file.mime_type || 'Unknown'}</small>
                            <small>Permission: {file.permission?.accessLevel || 'view'}</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        {overlayIndex !== null && (
          <div className="overlay-viewer" onClick={() => setOverlayIndex(null)}>
            <button type="button" className="overlay-nav left" onClick={(e) => { e.stopPropagation(); moveOverlay(-1); }}>&lt;</button>
            <div className="overlay-body" onClick={(e) => e.stopPropagation()}>
              {renderPreview()}
            </div>
            <button type="button" className="overlay-nav right" onClick={(e) => { e.stopPropagation(); moveOverlay(1); }}>&gt;</button>
            <button type="button" className="overlay-close" onClick={() => setOverlayIndex(null)}>Close</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicWorkspace;
