import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const withAuth = (config = {}) => ({
  ...config,
  headers: {
    ...getAuthHeaders(),
    ...(config.headers || {}),
  },
});

const createMultipartConfig = () =>
  withAuth({
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const authService = {
  requestRegistrationOtp: (username, email, password) =>
    axios.post(`${API_URL}/auth/register`, { username, email, password }),
  verifyRegistrationOtp: (email, otp) =>
    axios.post(`${API_URL}/auth/register/verify-otp`, { email, otp }),
  resendRegistrationOtp: (email) =>
    axios.post(`${API_URL}/auth/register/resend-otp`, { email }),
  login: (email, password) =>
    axios.post(`${API_URL}/auth/login`, { email, password }),
  getProfile: () => axios.get(`${API_URL}/auth/profile`, withAuth()),
};

export const userService = {
  searchUsers: (query) =>
    axios.get(`${API_URL}/users/search`, withAuth({ params: { q: query } })),
};

export const adminService = {
  listUsers: (query = '') =>
    axios.get(`${API_URL}/admin/users`, withAuth({ params: { q: query } })),
  updateUser: (userId, payload) =>
    axios.patch(`${API_URL}/admin/users/${userId}`, payload, withAuth()),
  unblockUser: (userId) =>
    axios.post(`${API_URL}/admin/users/${userId}/unblock`, {}, withAuth()),
  deleteUser: (userId) =>
    axios.delete(`${API_URL}/admin/users/${userId}`, withAuth()),
  getLogs: (query = '') =>
    axios.get(`${API_URL}/admin/logs`, withAuth({ params: { q: query } })),
};

export const fileService = {
  uploadFile: (file, uploadName = file.name) => {
    const formData = new FormData();
    formData.append('file', file, uploadName);
    return axios.post(`${API_URL}/files/upload`, formData, createMultipartConfig());
  },
  replaceFileContent: (fileId, file) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return axios.put(`${API_URL}/files/${fileId}/content`, formData, createMultipartConfig());
  },
  listFiles: (query = '', sort = '', options = {}) =>
    axios.get(`${API_URL}/files/list`, withAuth({ params: { q: query, sort, ...options } })),
  getSharedFiles: (query = '', sort = '', options = {}) =>
    axios.get(`${API_URL}/files/shared/list`, withAuth({ params: { q: query, sort, ...options } })),
  searchFiles: (query = '', sort = '', options = {}) =>
    axios.get(`${API_URL}/files/search`, withAuth({ params: { q: query, sort, ...options } })),
  getPublicFiles: (query = '', sort = '', options = {}) =>
    axios.get(`${API_URL}/files/public`, { params: { q: query, sort, ...options } }),
  getFileDetails: (fileId) =>
    axios.get(`${API_URL}/files/${fileId}`, withAuth()),
  getPrivateLinkDetails: (shareToken) =>
    axios.get(`${API_URL}/files/link/private/${shareToken}`, withAuth()),
  getPublicLinkDetails: (publicShareToken) =>
    axios.get(`${API_URL}/files/link/public/${publicShareToken}`, withAuth()),
  viewFile: (fileId) =>
    axios.get(`${API_URL}/files/${fileId}/content`, withAuth({ responseType: 'blob' })),
  viewPrivateLinkFile: (shareToken) =>
    axios.get(`${API_URL}/files/link/private/${shareToken}/content`, withAuth({ responseType: 'blob' })),
  viewPublicLinkFile: (publicShareToken) =>
    axios.get(`${API_URL}/files/link/public/${publicShareToken}/content`, withAuth({ responseType: 'blob' })),
  downloadFile: (fileId) =>
    axios.get(`${API_URL}/files/${fileId}/download`, withAuth({ responseType: 'blob' })),
  downloadPrivateLinkFile: (shareToken) =>
    axios.get(`${API_URL}/files/link/private/${shareToken}/download`, withAuth({ responseType: 'blob' })),
  downloadPublicLinkFile: (publicShareToken) =>
    axios.get(`${API_URL}/files/link/public/${publicShareToken}/download`, withAuth({ responseType: 'blob' })),
  deleteFile: (fileId) =>
    axios.delete(`${API_URL}/files/${fileId}`, withAuth()),
  updateFile: (fileId, payload) =>
    axios.patch(`${API_URL}/files/${fileId}`, payload, withAuth()),
  shareFile: (fileId, payload) =>
    axios.post(`${API_URL}/files/${fileId}/share`, payload, withAuth()),
  getFileShares: (fileId) =>
    axios.get(`${API_URL}/files/${fileId}/shares`, withAuth()),
  removeShare: (fileId, sharedUserId) =>
    axios.delete(`${API_URL}/files/${fileId}/shares/${sharedUserId}`, withAuth()),
  requestAccessToPrivateLink: (shareToken, message = '') =>
    axios.post(`${API_URL}/files/link/private/${shareToken}/request`, { message }, withAuth()),
  getAccessRequests: (query = '', sort = 'created', status = '') =>
    axios.get(`${API_URL}/files/requests`, withAuth({ params: { q: query, sort, status } })),
  resolveAccessRequest: (requestId, action) =>
    axios.post(`${API_URL}/files/requests/${requestId}/resolve`, { action }, withAuth()),
};
