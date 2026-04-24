import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Workspace from './pages/Workspace';
import PublicWorkspace from './pages/PublicWorkspace';
import FileViewer from './pages/FileViewer';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login onLogin={() => setIsAuthenticated(true)} /> : <Navigate to="/drive" />}
        />
        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/drive" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Workspace mode="dashboard" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/drive"
          element={isAuthenticated ? <Workspace mode="drive" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/shared"
          element={isAuthenticated ? <Workspace mode="shared" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/all-files"
          element={isAuthenticated ? <Workspace mode="all" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/starred"
          element={isAuthenticated ? <Workspace mode="starred" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/requests"
          element={isAuthenticated ? <Workspace mode="requests" theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminPanel theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} /> : <Navigate to="/explore" />}
        />
        <Route
          path="/explore"
          element={<PublicWorkspace isAuthenticated={isAuthenticated} theme={theme} onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} onLogout={() => setIsAuthenticated(false)} />}
        />
        <Route path="/file/:fileId" element={<FileViewer isAuthenticated={isAuthenticated} />} />
        <Route path="/file/private/:shareToken" element={<FileViewer isAuthenticated={isAuthenticated} linkMode="private" />} />
        <Route path="/file/public/:publicShareToken" element={<FileViewer isAuthenticated={isAuthenticated} linkMode="public" />} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/explore"} />} />
      </Routes>
    </Router>
  );
}

export default App;
