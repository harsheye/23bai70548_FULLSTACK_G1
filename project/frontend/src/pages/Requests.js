import React, { useEffect, useState } from 'react';
import { HiCheck, HiOutlineMagnifyingGlass, HiXMark } from 'react-icons/hi2';
import { fileService } from '../services/api';
import '../styles/Dashboard.css';

function Requests() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = async (nextQuery = query, nextSort = sortBy, nextStatus = status) => {
    setLoading(true);
    setError('');
    try {
      const response = await fileService.getAccessRequests(nextQuery, nextSort, nextStatus);
      setItems(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, status]);

  const resolveRequest = async (requestId, action) => {
    try {
      await fileService.resolveAccessRequest(requestId, action);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update request');
    }
  };

  return (
    <div className="workspace-shell public-shell">
      <main className="workspace-main full-width">
        <header className="dashboard-header">
          <div className="header-copy">
            <p className="eyebrow">Requests</p>
            <h1>Access Requests</h1>
            <p className="subtitle">Review file access requests, search past activity, and approve or decline quickly.</p>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="workspace-toolbar">
            <div className="search-shell">
              <HiOutlineMagnifyingGlass />
              <input
                type="search"
                placeholder="Search by file or requester"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  loadRequests(e.target.value, sortBy, status);
                }}
              />
            </div>
            <div className="workspace-toolbar-actions">
              <div className="sort-pills">
                {['created', 'updated', 'resolved'].map((option) => (
                  <button key={option} type="button" className={`sort-pill ${sortBy === option ? 'active' : ''}`} onClick={() => setSortBy(option)}>
                    {option}
                  </button>
                ))}
              </div>
              <div className="sort-pills">
                {['', 'pending', 'approved', 'declined'].map((option) => (
                  <button key={option || 'all'} type="button" className={`sort-pill ${status === option ? 'active' : ''}`} onClick={() => setStatus(option)}>
                    {option || 'all'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <p className="empty-panel">Loading requests...</p>
          ) : items.length === 0 ? (
            <p className="empty-panel">No access requests found.</p>
          ) : (
            <div className="workspace-file-list">
              {items.map((item) => (
                <article key={item.id} className="workspace-file-card list">
                  <div className="file-card-main">
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Requests;
