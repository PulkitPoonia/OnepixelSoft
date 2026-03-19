import React, { useState } from 'react';
import { Card, Row, Col, Button, Dropdown, Modal } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import { 
  deleteFile, 
  toggleStar, 
  renameFile, 
  getFileDetails,
  restoreFile,
  permanentlyDeleteFile
} from '../../../redux/action/FileManager';
import { 
  Star, 
  MoreVertical, 
  Download, 
  Trash2, 
  Edit2, 
  Eye,
  File,
  Image,
  FileText,
  RotateCcw
} from 'react-feather';

import { API_BASE as BASE_URL } from '../../../config';

const FmGrid = ({ 
  files = [], 
  deleteFile, 
  toggleStar, 
  renameFile, 
  getFileDetails,
  restoreFile,
  permanentlyDeleteFile,
  currentCategory,
  setCurrentFile 
}) => {
  const [renameModal, setRenameModal] = useState({ show: false, fileId: null, currentName: '' });
  const [newName, setNewName] = useState('');

  if (!files) {
    console.warn('FmGrid: files prop is null or undefined, using empty array');
    return <div style={{ padding: '20px', color: '#666' }}>No files to display</div>;
  }

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <Image size={32} />;
    if (mimeType === 'application/pdf') return <FileText size={32} />;
    return <File size={32} />;
  };

  const getFileTypeColor = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '#6366f1';
    if (mimeType?.startsWith('video/')) return '#f59e0b';
    if (mimeType === 'application/pdf') return '#ef4444';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '#3b82f6';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return '#10b981';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '#f97316';
    return '#6b7280';
  };

  const getFileType = (mimeType, filename) => {
    if (mimeType?.startsWith('image/')) return 'Image';
    if (mimeType?.startsWith('video/')) return 'Video';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'Document';
    if (mimeType?.includes('sheet') || mimeType?.includes('excel')) return 'Spreadsheet';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'Presentation';
    const ext = filename?.split('.')?.pop()?.toUpperCase();
    return ext || 'File';
  };

  const isImageFile = (mimeType) => {
    return mimeType?.startsWith('image/');
  };

  const getFileExtension = (filename) => {
    const parts = filename?.split('.');
    return parts?.[parts.length - 1]?.toUpperCase() || 'FILE';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleRenameClick = (file) => {
    setRenameModal({ show: true, fileId: file._id, currentName: file.originalName });
    setNewName(file.originalName);
  };

  const handleRenameSave = async () => {
    if (newName && newName !== renameModal.currentName) {
      await renameFile(renameModal.fileId, newName);
    }
    setRenameModal({ show: false, fileId: null, currentName: '' });
    setNewName('');
  };

  const handleDownload = (file) => {
    const link = document.createElement('a');
    link.href = `${BASE_URL}${file.path}`;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter out deleted files unless in trash view
  const displayFiles = currentCategory === 'trash' 
    ? files 
    : files.filter(f => !f.deletedAt);

  // DETAILED LOGGING
  if (currentCategory === 'trash') {
    console.log('🗑️ [FmGrid TRASH VIEW]', {
      currentCategory,
      totalFilesInState: files.length,
      displayFilesCount: displayFiles.length,
      displayFileIds: displayFiles.map(f => f._id),
      deletedAtValues: displayFiles.map(f => ({ id: f._id, name: f.originalName, deletedAt: f.deletedAt }))
    });
  }

  return (
    <div className="fm-body">
      <SimpleBar className="nicescroll-bar">
        <div className="file-card-view">
          {displayFiles && displayFiles.length > 0 ? (
            <Row className="g-3" style={{ padding: '20px' }}>
              {displayFiles.map((file) => (
                <Col lg={3} md={4} sm={6} key={file._id}>
                  <Card className="file-card h-100 shadow-sm">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="file-icon-wrapper w-100">
                          {isImageFile(file.mimeType) ? (
                            <div className="file-thumbnail bg-light rounded-3 p-0 d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '120px' }}>
                              <img 
                                src={`${BASE_URL}${file.path}`} 
                                alt={file.originalName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3E%3Crect fill="%23f0f0f0" width="120" height="120"/%3E%3Ctext x="50%25" y="50%25" font-size="14" text-anchor="middle" dy=".3em" fill="%23999"%3E Image %3C/text%3E%3C/svg%3E'; }}
                              />
                            </div>
                          ) : (
                            <div className="file-icon rounded-3 p-4 d-flex flex-column align-items-center justify-content-center" style={{ height: '120px', backgroundColor: getFileTypeColor(file.mimeType) + '20', borderLeft: `4px solid ${getFileTypeColor(file.mimeType)}` }}>
                              <div style={{ color: getFileTypeColor(file.mimeType), marginBottom: '8px' }}>
                                {getFileIcon(file.mimeType)}
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: getFileTypeColor(file.mimeType), textAlign: 'center' }}>
                                {getFileType(file.mimeType, file.originalName)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-start">
                        <div></div>
                        <div className="file-actions">
                          <button
                            className="btn btn-icon btn-sm"
                            onClick={() => toggleStar(file._id)}
                            title={file.isStarred ? 'Unstar' : 'Star'}
                          >
                            <Star 
                              size={18} 
                              fill={file.isStarred ? 'currentColor' : 'none'}
                              stroke={file.isStarred ? 'currentColor' : '#999'}
                            />
                          </button>
                          <Dropdown>
                            <Dropdown.Toggle 
                              as="button"
                              bsPrefix="btn btn-icon btn-sm"
                              id={`file-menu-${file._id}`}
                            >
                              <MoreVertical size={18} />
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                              {currentCategory === 'trash' ? (
                                <>
                                  <Dropdown.Item 
                                    onClick={() => {
                                      console.log('🔄 [RESTORE CLICK]', file.originalName);
                                      restoreFile(file._id);
                                    }}
                                    className="text-success"
                                  >
                                    <RotateCcw size={16} className="me-2" />
                                    Restore
                                  </Dropdown.Item>
                                  <Dropdown.Item 
                                    onClick={() => permanentlyDeleteFile(file._id)}
                                    className="text-danger"
                                  >
                                    <Trash2 size={16} className="me-2" />
                                    Permanently Delete
                                  </Dropdown.Item>
                                </>
                              ) : (
                                <>
                                  <Dropdown.Item 
                                    onClick={() => {
                                      getFileDetails(file._id);
                                      window.open(`${BASE_URL}${file.path}`, '_blank');
                                    }}
                                  >
                                    <Eye size={16} className="me-2" />
                                    View
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleDownload(file)}>
                                    <Download size={16} className="me-2" />
                                    Download
                                  </Dropdown.Item>
                                  <Dropdown.Item onClick={() => handleRenameClick(file)}>
                                    <Edit2 size={16} className="me-2" />
                                    Rename
                                  </Dropdown.Item>
                                  <Dropdown.Divider />
                                  <Dropdown.Item 
                                    onClick={() => deleteFile(file._id)}
                                    className="text-danger"
                                  >
                                    <Trash2 size={16} className="me-2" />
                                    Delete
                                  </Dropdown.Item>
                                </>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </div>
                      
                      {!isImageFile(file.mimeType) && (
                        <h6 className="file-name text-truncate mb-2" title={file.originalName}>
                          {file.originalName}
                        </h6>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Card>
              <Card.Header>
                <h5 className="mb-0">File Manager</h5>
              </Card.Header>
              <Card.Body>
                <p className="text-muted text-center py-5">
                  No files in this category. Select another category or upload some files.
                </p>
              </Card.Body>
            </Card>
          )}
        </div>
      </SimpleBar>

      {/* Rename Modal */}
      <Modal show={renameModal.show} onHide={() => setRenameModal({ show: false, fileId: null, currentName: '' })}>
        <Modal.Header closeButton>
          <Modal.Title>Rename File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input 
            type="text"
            className="form-control"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setRenameModal({ show: false, fileId: null, currentName: '' })}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRenameSave}>
            Rename
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

const mapStateToProps = (state) => {
  console.log('FmGrid mapStateToProps called, fileManagerReducer:', state.fileManagerReducer);
  return {
    files: state.fileManagerReducer?.filteredFiles || [],
    currentCategory: state.fileManagerReducer?.currentCategory || null
  };
};

const mapDispatchToProps = {
  deleteFile,
  toggleStar,
  renameFile,
  getFileDetails,
  restoreFile,
  permanentlyDeleteFile
};

export default connect(mapStateToProps, mapDispatchToProps)(FmGrid);
