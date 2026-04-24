import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiMiniMoon, HiMiniSun } from 'react-icons/hi2';
import { adminService, authService } from '../services/api';
import ToastStack from '../components/ToastStack';
import '../styles/Dashboard.css';

const BLOCK_PRESETS = [
  { label: 'None', mode: 'none', amount: 0, unit: 'days' },
  { label: '24 hours', mode: 'temporary', amount: 24, unit: 'hours' },
  { label: '7 days', mode: 'temporary', amount: 7, unit: 'days' },
  { label: '4 weeks', mode: 'temporary', amount: 4, unit: 'weeks' },
  { label: 'Permanent', mode: 'permanent', amount: 0, unit: 'days' },
];

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

function AdminPanel({ theme = 'dark', onToggleTheme, onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [logQuery, setLogQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [storageLimitMb, setStorageLimitMb] = useState(1024);
  const [transferLimitMb, setTransferLimitMb] = useState(500);
  const [selectedBlockPreset, setSelectedBlockPreset] = useState(BLOCK_PRESETS[0].label);
  const [blockReason, setBlockReason] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const pushNotification = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setNotifications((current) => current.filter((notification) => notification.id !== id));
    }, 3200);
  };

  const loadProfile = async () => {
    const response = await authService.getProfile();
    if (!response.data?.is_admin) {
      setAccessDenied(true);
      return null;
    }
    setAccessDenied(false);
    setProfile(response.data);
    return response.data;
  };

  const loadData = async (searchValue = query, logSearchValue = logQuery) => {
    setLoading(true);
    try {
      const [userResponse, logResponse] = await Promise.all([
        adminService.listUsers(searchValue),
        adminService.getLogs(logSearchValue),
      ]);
      setUsers(userResponse.data || []);
      setLogs(logResponse.data || []);
    } catch (error) {
      pushNotification(error.response?.data?.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        const nextProfile = await loadProfile();
        if (!nextProfile) {
          setLoading(false);
          return;
        }
        await loadData('', '');
      } catch (error) {
        pushNotification(error.response?.data?.message || 'Failed to load admin profile', 'error');
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedUser = useMemo(
    () => users.find((user) => Number(user.id) === Number(selectedUserId)) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setStorageLimitMb(Math.round((selectedUser.storage_limit_bytes || 0) / (1024 * 1024)) || 1024);
    setTransferLimitMb(Math.round((selectedUser.daily_transfer_limit_bytes || 0) / (1024 * 1024)) || 500);
    setSelectedRole(selectedUser.role || 'user');
    setSelectedBlockPreset(
      selectedUser.is_blocked
        ? selectedUser.blocked_until
          ? '7 days'
          : 'Permanent'
        : 'None'
    );
    setBlockReason(selectedUser.blocked_reason || '');
  }, [selectedUser]);

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    const preset = BLOCK_PRESETS.find((entry) => entry.label === selectedBlockPreset) || BLOCK_PRESETS[0];

    try {
      await adminService.updateUser(selectedUser.id, {
        role: selectedRole,
        storageLimitBytes: storageLimitMb * 1024 * 1024,
        dailyTransferLimitBytes: transferLimitMb * 1024 * 1024,
        blockMode: preset.mode,
        blockAmount: preset.amount,
        blockUnit: preset.unit,
        blockReason,
      });
      pushNotification('User controls updated successfully');
      await loadData();
    } catch (error) {
      pushNotification(error.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleUnblock = async () => {
    if (!selectedUser) return;
    try {
      await adminService.unblockUser(selectedUser.id);
      pushNotification('User unblocked successfully');
      await loadData();
    } catch (error) {
      pushNotification(error.response?.data?.message || 'Failed to unblock user', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Delete ${selectedUser.username} permanently?`)) return;

    try {
      await adminService.deleteUser(selectedUser.id);
      pushNotification('User deleted permanently');
      setSelectedUserId(null);
      await loadData();
    } catch (error) {
      pushNotification(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  return (
    <div className="workspace-shell public-shell">
      <ToastStack
        notifications={notifications}
        onDismiss={(id) => setNotifications((current) => current.filter((notification) => notification.id !== id))}
      />
      <main className="workspace-main full-width">
        <header className="workspace-topbar">
          <div className="workspace-topbar-left">
            <strong>Admin Panel</strong>
          </div>
          <div className="workspace-topbar-center">
            <div className="search-shell">
              <input
                type="search"
                placeholder="Search users"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    loadData(event.currentTarget.value, logQuery);
                  }
                }}
              />
            </div>
          </div>
          <div className="workspace-topbar-right">
            <button type="button" className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <HiMiniSun /> : <HiMiniMoon />}
            </button>
            <Link className="button button-secondary" to="/dashboard">Back to Drive</Link>
            <button
              type="button"
              className="button button-secondary"
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

        <div className="workspace-content">
          {accessDenied ? (
            <section className="admin-card admin-log-card">
              <div className="admin-card-header">
                <div>
                  <h2>Admin Access Required</h2>
                  <p>This account is not marked as an admin.</p>
                </div>
              </div>
              <div className="file-actions">
                <button type="button" className="button button-secondary" onClick={() => navigate('/dashboard')}>
                  Back to Drive
                </button>
              </div>
            </section>
          ) : (
            <>
          <div className="admin-grid">
            <section className="admin-card admin-users-card">
              <div className="admin-card-header">
                <div>
                  <h2>Users</h2>
                  <p>{profile?.username || 'Admin'} can control access, quotas, and blocking.</p>
                </div>
                <button type="button" className="button button-secondary" onClick={() => loadData(query, logQuery)}>
                  Refresh
                </button>
              </div>

              {loading ? (
                <p className="empty-panel">Loading users...</p>
              ) : (
                <div className="admin-user-list">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`admin-user-row ${selectedUserId === user.id ? 'active' : ''}`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div>
                        <strong>{user.username}</strong>
                        <span>{user.email}</span>
                      </div>
                      <div className="admin-user-badges">
                        <span className={`admin-badge ${user.role}`}>{user.role}</span>
                        {user.is_blocked && <span className="admin-badge blocked">Blocked</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-card admin-detail-card">
              <div className="admin-card-header">
                <div>
                  <h2>User Controls</h2>
                  <p>{selectedUser ? `Managing ${selectedUser.username}` : 'Pick a user to edit limits and access.'}</p>
                </div>
              </div>

              {selectedUser ? (
                <div className="admin-form">
                  <div className="admin-stat-grid">
                    <div className="admin-stat">
                      <span>Storage used</span>
                      <strong>{formatBytes(selectedUser.storage_used_bytes)}</strong>
                    </div>
                    <div className="admin-stat">
                      <span>Daily transfer</span>
                      <strong>{formatBytes((selectedUser.daily_upload_bytes || 0) + (selectedUser.daily_download_bytes || 0))}</strong>
                    </div>
                    <div className="admin-stat">
                      <span>Files</span>
                      <strong>{selectedUser.file_count}</strong>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <label className="input-group">
                      <span>Role</span>
                      <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <label className="input-group">
                      <span>Storage limit (MB)</span>
                      <input type="number" min="1" value={storageLimitMb} onChange={(event) => setStorageLimitMb(Number(event.target.value) || 1)} />
                    </label>
                    <label className="input-group">
                      <span>Daily transfer limit (MB)</span>
                      <input type="number" min="1" value={transferLimitMb} onChange={(event) => setTransferLimitMb(Number(event.target.value) || 1)} />
                    </label>
                    <label className="input-group">
                      <span>Block duration</span>
                      <select value={selectedBlockPreset} onChange={(event) => setSelectedBlockPreset(event.target.value)}>
                        {BLOCK_PRESETS.map((preset) => (
                          <option key={preset.label} value={preset.label}>{preset.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="input-group">
                    <span>Block reason</span>
                    <textarea rows="3" value={blockReason} onChange={(event) => setBlockReason(event.target.value)} placeholder="Optional admin note" />
                  </label>

                  <div className="file-actions">
                    <button type="button" className="button button-primary" onClick={handleSaveUser}>
                      Save controls
                    </button>
                    <button type="button" className="button button-secondary" onClick={handleUnblock}>
                      Remove block
                    </button>
                    <button type="button" className="button button-danger" onClick={handleDelete}>
                      Delete permanently
                    </button>
                  </div>
                </div>
              ) : (
                <p className="empty-panel">Select a user from the list to manage limits, blocking, and deletion.</p>
              )}
            </section>
          </div>

          <section className="admin-card admin-log-card">
            <div className="admin-card-header">
              <div>
                <h2>Admin Logs</h2>
                <p>Recent admin actions across the workspace.</p>
              </div>
              <input
                className="admin-log-search"
                type="search"
                placeholder="Search logs"
                value={logQuery}
                onChange={(event) => setLogQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    loadData(query, event.currentTarget.value);
                  }
                }}
              />
            </div>

            <div className="admin-log-list">
              {logs.map((entry) => (
                <article key={entry.id} className="admin-log-entry">
                  <strong>{entry.action_type.replace(/_/g, ' ')}</strong>
                  <span>{entry.admin_username} to {entry.target_username || entry.target_email || 'removed user'}</span>
                  <small>{new Date(entry.created_at).toLocaleString()}</small>
                </article>
              ))}
            </div>
          </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPanel;
