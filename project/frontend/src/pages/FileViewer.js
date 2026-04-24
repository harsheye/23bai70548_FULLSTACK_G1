import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  HiChevronLeft,
  HiChevronRight,
  HiMiniArrowDownTray,
  HiMiniArrowsPointingOut,
  HiMiniClock,
  HiMiniDocumentDuplicate,
  HiMiniEye,
  HiMiniLink,
  HiMiniShare,
} from 'react-icons/hi2';
import { fileService } from '../services/api';
import ToastStack from '../components/ToastStack';
import VideoPlayer from '../components/VideoPlayer';
import '../styles/Dashboard.css';

const formatBytes = (value = 0) => {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? size.toFixed(unitIndex === 0 ? 0 : 1) : size.toFixed(2)} ${units[unitIndex]}`;
};

const formatDateTime = (value) => {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString();
};

const formatDaysAgo = (value) => {
  if (!value) return 'Never';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

function FileViewer({ isAuthenticated, linkMode = 'id' }) {
  const { fileId, shareToken, publicShareToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const detailsRef = useRef(null);
  const previewFrameRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestStatus, setRequestStatus] = useState('');
  const [notifications, setNotifications] = useState([]);
  const playlist = Array.isArray(location.state?.playlist) ? location.state.playlist : [];
  const currentPlaylistIndex = playlist.findIndex((entry) => String(entry.id) === String(fileId));
  const hasPlaylistNavigation = linkMode === 'id' && currentPlaylistIndex !== -1 && playlist.length > 1;
  const disableContextMenu =
    linkMode !== 'id' && file?.permission?.accessLevel === 'view' && file?.permission?.canView;

  const pushNotification = (message, type = 'error') => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, 3200);
  };

  useEffect(() => {
    if (!error) return;
    pushNotification(error, 'error');
  }, [error]);

  useEffect(() => {
    let objectUrl = '';

    const loadPreviewForFile = async (nextFile, modeOverride = linkMode) => {
      if (!nextFile?.permission?.canView) {
        return;
      }

      const blobResponse =
        modeOverride === 'private'
          ? await fileService.viewPrivateLinkFile(shareToken)
          : modeOverride === 'public'
            ? await fileService.viewPublicLinkFile(publicShareToken)
            : await fileService.viewFile(nextFile.id || fileId);
      objectUrl = URL.createObjectURL(blobResponse.data);
      setPreviewUrl(objectUrl);
    };

    const loadFile = async () => {
      setLoading(true);
      setError('');
      setRequestStatus('');

      try {
        const detailResponse =
          linkMode === 'private'
            ? await fileService.getPrivateLinkDetails(shareToken)
            : linkMode === 'public'
              ? await fileService.getPublicLinkDetails(publicShareToken)
              : await fileService.getFileDetails(fileId);
        const nextFile = detailResponse.data;
        setFile(nextFile);
        await loadPreviewForFile(nextFile);
      } catch (err) {
        if (linkMode === 'private' && err.response?.status === 403) {
          const deniedFile = err.response?.data?.file || null;

          if (isAuthenticated && deniedFile?.id) {
            try {
              const fallbackDetailResponse = await fileService.getFileDetails(deniedFile.id);
              const accessibleFile = fallbackDetailResponse.data;
              setFile(accessibleFile);
              await loadPreviewForFile(accessibleFile, 'id');
              setError('');
              setRequestStatus('');
              setLoading(false);
              return;
            } catch (fallbackError) {
              setFile(deniedFile);
              setRequestStatus(err.response?.data?.latestRequest?.status || '');
              setError(
                fallbackError.response?.data?.message || err.response?.data?.message || 'Failed to load file'
              );
              setLoading(false);
              return;
            }
          }

          setFile(deniedFile);
          setRequestStatus(err.response?.data?.latestRequest?.status || '');
        }
        setError(err.response?.data?.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileId, shareToken, publicShareToken, linkMode, isAuthenticated]);

  const handleDownload = async () => {
    try {
      const response =
        linkMode === 'private'
          ? await fileService.downloadPrivateLinkFile(shareToken)
          : linkMode === 'public'
            ? await fileService.downloadPublicLinkFile(publicShareToken)
            : await fileService.downloadFile(fileId);
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

  const handleRequestAccess = async () => {
    if (!shareToken) return;
    setRequestingAccess(true);
    try {
      await fileService.requestAccessToPrivateLink(shareToken);
      setRequestStatus('pending');
      setError('');
      pushNotification('Access request sent', 'success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request access');
    } finally {
      setRequestingAccess(false);
    }
  };

  const navigatePlaylist = (direction) => {
    if (!hasPlaylistNavigation) return;
    const nextIndex = (currentPlaylistIndex + direction + playlist.length) % playlist.length;
    const nextEntry = playlist[nextIndex];
    navigate(`/file/${nextEntry.id}`, {
      state: {
        ...location.state,
        currentId: nextEntry.id,
      },
    });
  };

  const canonicalLink = useMemo(() => {
    if (linkMode === 'private') return file?.private_url || window.location.href;
    if (linkMode === 'public') return file?.public_url || window.location.href;
    return file?.public_url || file?.private_url || window.location.href;
  }, [file, linkMode]);

  const transferUsage = file?.transfer_usage;
  const transferPercent = transferUsage?.transfer_limit_bytes
    ? Math.min((transferUsage.download_bytes_used / transferUsage.transfer_limit_bytes) * 100, 100)
    : 0;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard?.writeText(canonicalLink);
      pushNotification('Link copied', 'success');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: file?.display_name || 'Shared file',
          text: file?.display_name || 'Shared file',
          url: canonicalLink,
        });
        return;
      }
      await handleCopyLink();
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError('Failed to share link');
      }
    }
  };

  const handleShowDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFullscreen = async () => {
    const target = previewFrameRef.current;
    if (!target?.requestFullscreen) {
      setError('Fullscreen is not available in this browser');
      return;
    }

    try {
      await target.requestFullscreen();
    } catch (err) {
      setError('Failed to enter fullscreen');
    }
  };

  const renderPreview = () => {
    if (!file || !previewUrl) {
      return (
        <div className="public-file-preview-empty">
          <p>No preview is available for this file type. Download to open it locally.</p>
        </div>
      );
    }

    if (file.preview_kind === 'image') {
      return <img src={previewUrl} alt={file.display_name} className="viewer-image public-file-preview-media" />;
    }

    if (file.preview_kind === 'video') {
      return <VideoPlayer src={previewUrl} className="viewer-frame custom-viewer-player public-file-preview-media" />;
    }

    if (file.preview_kind === 'pdf') {
      return (
        <iframe
          title={file.display_name}
          src={previewUrl}
          className="viewer-frame viewer-pdf-frame public-file-preview-media"
        />
      );
    }

    if (file.preview_kind === 'text') {
      return <iframe title={file.display_name} src={previewUrl} className="viewer-frame public-file-preview-media" />;
    }

    return (
      <div className="public-file-preview-empty">
        <p>No preview is available for this file type. Download to open it locally.</p>
      </div>
    );
  };

  const stats = [
    {
      label: 'Views',
      value: file?.insights?.views ?? 0,
      icon: <HiMiniEye />,
    },
    {
      label: 'Downloads',
      value: file?.insights?.downloads ?? 0,
      icon: <HiMiniArrowDownTray />,
    },
    {
      label: 'Accessed',
      value: formatDaysAgo(file?.insights?.last_accessed_at),
      icon: <HiMiniClock />,
    },
  ];

  const actionButtons = [
    {
      key: 'download',
      label: 'Download',
      icon: <HiMiniArrowDownTray />,
      visible: Boolean(file?.permission?.canDownload),
      onClick: handleDownload,
      primary: true,
    },
    {
      key: 'copy',
      label: 'Copy link',
      icon: <HiMiniDocumentDuplicate />,
      visible: Boolean(file),
      onClick: handleCopyLink,
    },
    {
      key: 'share',
      label: 'Share',
      icon: <HiMiniShare />,
      visible: Boolean(file),
      onClick: handleShare,
    },
    {
      key: 'fullscreen',
      label: 'Fullscreen',
      icon: <HiMiniArrowsPointingOut />,
      visible: Boolean(previewUrl),
      onClick: handleFullscreen,
    },
    {
      key: 'details',
      label: 'Details',
      icon: <HiMiniLink />,
      visible: Boolean(file),
      onClick: handleShowDetails,
    },
  ];

  return (
    <div
      className="workspace-shell public-shell public-file-shell"
      onContextMenu={(event) => {
        if (disableContextMenu) {
          event.preventDefault();
        }
      }}
    >
      <ToastStack
        notifications={notifications}
        onDismiss={(id) => setNotifications((current) => current.filter((notification) => notification.id !== id))}
      />
      <main className="workspace-main full-width public-file-main">
        <div className="public-file-layout">
          <aside className="public-file-sidebar">
            <div className="public-file-sidebar-top">
              <button type="button" className="public-file-back" onClick={() => navigate(-1)}>
                Back
              </button>
              <div className="public-file-link-chip">
                <span className="public-file-link-chip-dot" />
                <strong>{file?.owner_username || 'Shared file'}</strong>
              </div>
            </div>

            <div className="public-file-stats">
              {stats.map((stat) => (
                <div key={stat.label} className="public-file-stat">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>

            <div className="public-file-actions">
              {actionButtons.filter((action) => action.visible).map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={`public-file-action ${action.primary ? 'primary' : ''}`}
                  onClick={action.onClick}
                >
                  <span>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            <div className="public-file-sidebar-footer">
              <Link className="public-file-return-link" to={isAuthenticated ? '/drive' : '/explore'}>
                {isAuthenticated ? 'Go to Drive' : 'Explore library'}
              </Link>
            </div>
          </aside>

          <section className="public-file-content">
            {loading ? (
              <p className="empty-panel">Loading preview...</p>
            ) : (
              <>
                <header className="public-file-hero">
                  <h1>{file?.display_name || 'Opening file'}</h1>
                </header>

                <div className="public-file-card" ref={previewFrameRef}>
                  <div className={`public-file-poster public-file-poster-${file?.preview_kind || 'file'}`}>
                    <span>{(file?.display_name || file?.file_name || 'FI').slice(0, 2).toUpperCase()}</span>
                  </div>

                  <div className="public-file-card-body">
                    <div className="public-file-card-meta">
                      <p><strong>Type:</strong> {file?.mime_type || 'Unknown'}</p>
                      <p><strong>Size:</strong> {formatBytes(file?.file_size || 0)}</p>
                      <p><strong>Uploaded:</strong> {formatDateTime(file?.insights?.uploaded_at || file?.created_at)}</p>
                    </div>

                    {error && linkMode === 'private' && !previewUrl ? (
                      <div className="public-file-preview-empty access-denied">
                        <p>{error}</p>
                        {isAuthenticated ? (
                          <button
                            type="button"
                            className="public-file-inline-download"
                            onClick={handleRequestAccess}
                            disabled={requestingAccess || requestStatus === 'pending'}
                          >
                            {requestStatus === 'pending'
                              ? 'Request pending'
                              : requestingAccess
                                ? 'Sending request...'
                                : 'Request access'}
                          </button>
                        ) : (
                          <Link className="public-file-inline-download" to="/login">
                            Login to request access
                          </Link>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="public-file-preview-shell">{renderPreview()}</div>
                        {file?.permission?.canDownload && (
                          <button type="button" className="public-file-inline-download" onClick={handleDownload}>
                            <HiMiniArrowDownTray />
                            <span>Download</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {hasPlaylistNavigation && (
                  <div className="public-file-nav-row">
                    <button type="button" className="public-file-nav-button" onClick={() => navigatePlaylist(-1)}>
                      <HiChevronLeft />
                      <span>Previous</span>
                    </button>
                    <button type="button" className="public-file-nav-button" onClick={() => navigatePlaylist(1)}>
                      <span>Next</span>
                      <HiChevronRight />
                    </button>
                  </div>
                )}

                <section className="public-file-transfer-card">
                  <p>
                    You have used {formatBytes(transferUsage?.download_bytes_used || 0)} of your daily{' '}
                    {formatBytes(transferUsage?.transfer_limit_bytes || 0)} transfer limit. When the transfer limit is
                    exceeded the download speed for new downloads will be limited.
                  </p>
                  <div className="public-file-transfer-bar">
                    <span style={{ width: `${transferPercent}%` }} />
                  </div>
                  <div className="public-file-transfer-meta">
                    <strong>{Math.round(transferPercent)}% used</strong>
                    <span>{formatBytes(transferUsage?.remaining_bytes || 0)} remaining today</span>
                  </div>
                </section>

                <section className="public-file-details-card" ref={detailsRef}>
                  <h2>File details</h2>
                  <div className="public-file-details-grid">
                    <div><span>Name</span><strong>{file?.display_name || 'Unknown'}</strong></div>
                    <div><span>Path</span><strong>{file?.path || 'Root'}</strong></div>
                    <div><span>Mime type</span><strong>{file?.mime_type || 'Unknown'}</strong></div>
                    <div><span>Permission</span><strong>{file?.permission?.accessLevel || file?.permission?.role || 'none'}</strong></div>
                    <div><span>Views</span><strong>{file?.insights?.views ?? 0}</strong></div>
                    <div><span>Downloads</span><strong>{file?.insights?.downloads ?? 0}</strong></div>
                    <div><span>Last viewed</span><strong>{formatDateTime(file?.insights?.last_viewed_at)}</strong></div>
                    <div><span>Last downloaded</span><strong>{formatDateTime(file?.insights?.last_downloaded_at)}</strong></div>
                    <div><span>Last accessed</span><strong>{formatDateTime(file?.insights?.last_accessed_at)}</strong></div>
                    <div><span>Link</span><strong className="public-file-detail-link">{canonicalLink}</strong></div>
                  </div>
                </section>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default FileViewer;
