import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
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

function Profile({ onLogout, theme = 'dark', onToggleTheme }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await authService.getProfile();
        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const storagePercent = profile?.storage_limit_bytes
    ? Math.min((profile.storage_used_bytes / profile.storage_limit_bytes) * 100, 100)
    : 0;
  const transferPercent = profile?.daily_transfer_limit_bytes
    ? Math.min(
        ((profile.daily_upload_bytes + profile.daily_download_bytes) / profile.daily_transfer_limit_bytes) * 100,
        100
      )
    : 0;

  return (
    <div className="workspace-shell public-shell profile-page-shell">
      <main className="workspace-main full-width">
        <header className="dashboard-header">
          <div className="header-copy">
            <p className="eyebrow">Account</p>
            <h1>Profile</h1>
            <p className="subtitle">Manage your account details, storage usage, and transfer limits.</p>
          </div>
          <div className="header-actions">
            <button type="button" className="button button-secondary" onClick={onToggleTheme}>
              Theme: {theme}
            </button>
            <button type="button" className="button button-secondary" onClick={() => navigate('/drive')}>
              Back to Drive
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                onLogout();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {loading ? (
            <p className="empty-panel">Loading profile...</p>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <div className="profile-page-grid">
              <section className="viewer-panel profile-summary-card">
                <div className="profile-avatar">{(profile?.username || 'U').slice(0, 2).toUpperCase()}</div>
                <div className="profile-summary-copy">
                  <h2>{profile?.username}</h2>
                  <p>{profile?.email}</p>
                  <span className="profile-role-chip">{profile?.role}</span>
                </div>
              </section>

              <section className="viewer-panel profile-stat-card">
                <h3>Storage usage</h3>
                <strong>{formatBytes(profile?.storage_used_bytes)} / {formatBytes(profile?.storage_limit_bytes)}</strong>
                <div className="storage-widget-bar"><span style={{ width: `${storagePercent}%` }} /></div>
                <small>{Math.round(storagePercent)}% used</small>
              </section>

              <section className="viewer-panel profile-stat-card">
                <h3>Daily transfer</h3>
                <strong>
                  {formatBytes((profile?.daily_upload_bytes || 0) + (profile?.daily_download_bytes || 0))} / {formatBytes(profile?.daily_transfer_limit_bytes)}
                </strong>
                <div className="storage-widget-bar"><span style={{ width: `${transferPercent}%` }} /></div>
                <small>{Math.round(transferPercent)}% used today</small>
              </section>

              <section className="viewer-meta profile-detail-card">
                <h2>Profile details</h2>
                <p><strong>Username:</strong> {profile?.username}</p>
                <p><strong>Email:</strong> {profile?.email}</p>
                <p><strong>Role:</strong> {profile?.role}</p>
                <p><strong>Member since:</strong> {new Date(profile?.created_at).toLocaleString()}</p>
                <p><strong>Account status:</strong> {profile?.is_blocked ? 'Blocked' : 'Active'}</p>
                <p><strong>Upload today:</strong> {formatBytes(profile?.daily_upload_bytes)}</p>
                <p><strong>Download today:</strong> {formatBytes(profile?.daily_download_bytes)}</p>
                <p><strong>Guest IP transfer:</strong> {formatBytes((profile?.ip_daily_upload_bytes || 0) + (profile?.ip_daily_download_bytes || 0))}</p>
              </section>

              <section className="viewer-meta profile-shortcuts-card">
                <h2>Shortcuts</h2>
                <div className="profile-shortcuts">
                  <Link className="button button-primary" to="/drive">My Drive</Link>
                  <Link className="button button-secondary" to="/shared">Shared Files</Link>
                  <Link className="button button-secondary" to="/requests">Access Requests</Link>
                  {profile?.is_admin && <Link className="button button-secondary" to="/admin">Admin Panel</Link>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Profile;
