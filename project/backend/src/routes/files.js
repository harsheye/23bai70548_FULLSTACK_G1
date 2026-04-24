const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  uploadFile,
  listFiles,
  searchFiles,
  getPublicFiles,
  getFileDetails,
  getFileDetailsByPrivateToken,
  getFileDetailsByPublicToken,
  viewFile,
  viewFileByPrivateToken,
  viewFileByPublicToken,
  downloadFile,
  downloadFileByPrivateToken,
  downloadFileByPublicToken,
  updateFileMetadata,
  replaceFileContent,
  deleteFile,
  shareFile,
  removeShare,
  createAccessRequest,
  listAccessRequests,
  resolveAccessRequest,
  getFileShares,
  getSharedFiles
} = require('../controllers/fileController');
const authenticateToken = require('../middleware/auth');
const optionalAuthenticateToken = require('../middleware/optionalAuth');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB max

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), uploadFile);

// List user's files
router.get('/list', authenticateToken, listFiles);

// Search
router.get('/search', optionalAuthenticateToken, searchFiles);
router.get('/public', getPublicFiles);

// Get shared files
router.get('/shared/list', authenticateToken, getSharedFiles);
router.get('/requests', authenticateToken, listAccessRequests);
router.post('/requests/:requestId/resolve', authenticateToken, resolveAccessRequest);

// Token based links
router.get('/link/private/:shareToken', optionalAuthenticateToken, getFileDetailsByPrivateToken);
router.get('/link/private/:shareToken/content', optionalAuthenticateToken, viewFileByPrivateToken);
router.get('/link/private/:shareToken/download', optionalAuthenticateToken, downloadFileByPrivateToken);
router.post('/link/private/:shareToken/request', authenticateToken, createAccessRequest);
router.get('/link/public/:publicShareToken', optionalAuthenticateToken, getFileDetailsByPublicToken);
router.get('/link/public/:publicShareToken/content', optionalAuthenticateToken, viewFileByPublicToken);
router.get('/link/public/:publicShareToken/download', optionalAuthenticateToken, downloadFileByPublicToken);

// File details/content
router.get('/:fileId', optionalAuthenticateToken, getFileDetails);
router.get('/:fileId/content', optionalAuthenticateToken, viewFile);
router.get('/:fileId/download', optionalAuthenticateToken, downloadFile);

// Backward compatible download path
router.get('/download/:fileId', optionalAuthenticateToken, downloadFile);

// Update
router.patch('/:fileId', optionalAuthenticateToken, updateFileMetadata);
router.put('/:fileId/content', optionalAuthenticateToken, upload.single('file'), replaceFileContent);

// Delete file
router.delete('/:fileId', authenticateToken, deleteFile);

// Share file
router.post('/:fileId/share', authenticateToken, shareFile);
router.get('/:fileId/shares', authenticateToken, getFileShares);
router.delete('/:fileId/shares/:sharedUserId', authenticateToken, removeShare);

module.exports = router;
