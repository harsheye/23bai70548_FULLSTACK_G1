import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fileService } from '../services/api';
import '../styles/Dashboard.css';

function PublicLibrary({ isAuthenticated, onLogout }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlayIndex, setOverlayIndex] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => () => {
    if (overlayUrl) {
      URL.revokeObjectURL(overlayUrl);
    }
  }, [overlayUrl]);

  useEffect(() => {
    loadFiles('');
  }, []);

  const loadFiles = async (nextQuery) => {
    setLoading(true);
    setError('');
    try {
      const response = await fileService.getPublicFiles(nextQuery);
      setResults(response.data);
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

  const mediaItems = results.filter((item) => ['image', 'video', 'pdf'].includes(item.preview_kind));

  const openOverlay = async (file) => {
    const nextIndex = mediaItems.findIndex((item) => item.id === file.id);
    if (nextIndex === -1) return;

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
      return <video src={overlayUrl} controls className="overlay-media-frame" />;
    }
    return <iframe title={file.display_name} src={overlayUrl} className="overlay-media-frame" />;
  };

  return (
    <div className="workspace-shell public-shell">
      <main className="workspace-main full-width">
        <header className="dashboard-header">
          <div className="header-copy">
            <p className="eyebrow">Guest access</p>
            <h1>Public Drive Explorer</h1>
            <p className="subtitle">
              Search every publicly shared file, preview media directly, and download or edit when
              the owner allows it.
            </p>
          </div>

          <div className="header-actions">
            <div className="search-wrap">
              <input
                type="search"
                placeholder="Search public files"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
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
            {isAuthenticated ? (
              <>
                <button className="button button-secondary" onClick={() => navigate('/drive')}>
                  Go to Drive
                </button>
                <button className="button button-danger" onClick={onLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="button button-secondary" to="/login">
                  Login
                </Link>
                <Link className="button button-primary" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="dashboard-content">
          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <p className="empty-panel">Loading public files...</p>
          ) : results.length === 0 ? (
            <p className="empty-panel">No public files matched your search.</p>
          ) : (
            <div className={viewMode === 'grid' ? 'drive-grid' : 'drive-list'}>
              {results.map((file) => (
                <article
                  key={file.id}
                  className={`drive-card file-card ${viewMode === 'list' ? 'list-mode' : ''}`}
                >
                  <div className="drive-card-top">
                    <span className="drive-badge">{file.preview_kind}</span>
                    <strong>{file.display_name}</strong>
                  </div>
                  <p>{file.owner_username ? `Shared by ${file.owner_username}` : 'Public file'}</p>
                  <small>
                    {file.path ? `${file.path} • ` : ''}
                    {new Date(file.created_at).toLocaleDateString()}
                  </small>
                  <div className="file-actions">
                    <button
                      className="button button-primary"
                      onClick={() =>
                        ['image', 'video', 'pdf'].includes(file.preview_kind)
                          ? openOverlay(file)
                          : navigate(`/file/${file.id}`)
                      }
                    >
                      Open
                    </button>
                    {file.permission?.canDownload && (
                      <button className="button button-secondary" onClick={() => handleDownload(file)}>
                        Download
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {overlayIndex !== null && (
          <div className="overlay-viewer" onClick={() => setOverlayIndex(null)}>
            <button type="button" className="overlay-nav left" onClick={(e) => { e.stopPropagation(); moveOverlay(-1); }}>‹</button>
            <div className="overlay-body" onClick={(e) => e.stopPropagation()}>
              {renderPreview()}
            </div>
            <button type="button" className="overlay-nav right" onClick={(e) => { e.stopPropagation(); moveOverlay(1); }}>›</button>
            <button type="button" className="overlay-close" onClick={() => setOverlayIndex(null)}>Close</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicLibrary;
