import React, { useEffect, useRef } from 'react';
import { Button, Nav } from 'react-bootstrap';
import { Book, FileText, Image, Settings, Upload, Video, File, Star, Trash2 } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import { 
  uploadFile, 
  getFilesByCategory,
  getStorageInfo,
  getStarredFiles,
  getTrashedFiles
} from '../../redux/action/FileManager';

const FmSidebar = ({ 
  uploadFile, 
  getFilesByCategory,
  getStorageInfo,
  getStarredFiles,
  getTrashedFiles,
  storageInfo = {}
}) => {
  const fileInputRef = useRef(null);

  useEffect(() => {
    getStorageInfo();
  }, [getStorageInfo]);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;

    for (let file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target.result;
        const base64Data = fileData.split(',')[1];

        await uploadFile({
          filename: file.name,
          fileData: base64Data,
          fileSize: file.size,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCategoryClick = (category) => {
    localStorage.setItem('fileManagerCategory', category);
    getFilesByCategory(category);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const usedPercentage = storageInfo.usedPercentage || 0;

  return (
    <nav className="fmapp-sidebar">
      <SimpleBar className="nicescroll-bar">
        <div className="menu-content-wrap">
          <div className="btn btn-primary btn-rounded btn-block btn-file mb-4">
            <input 
              type="file" 
              className="upload" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
            />
            <Upload size={16} className="me-2" />
            Upload
          </div>
          <div className="separator separator-light" />
          <div className="menu-group">
            <ul className="nav nav-light navbar-nav flex-column">
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#images"
                  onClick={(e) => { e.preventDefault(); handleCategoryClick('images'); }}
                >
                  <span className="nav-icon-wrap">
                    <span className="feather-icon">
                      <Image />
                    </span>
                  </span>
                  <span className="nav-link-text">Images</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#videos"
                  onClick={(e) => { e.preventDefault(); handleCategoryClick('videos'); }}
                >
                  <span className="nav-icon-wrap">
                    <span className="feather-icon">
                      <Video />
                    </span>
                  </span>
                  <span className="nav-link-text">Videos</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#documents"
                  onClick={(e) => { e.preventDefault(); handleCategoryClick('documents'); }}
                >
                  <span className="nav-icon-wrap">
                    <span className="feather-icon">
                      <FileText />
                    </span>
                  </span>
                  <span className="nav-link-text">Documents</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#starred"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    getStarredFiles();
                    localStorage.setItem('fileManagerCategory', 'starred');
                  }}
                >
                  <span className="nav-icon-wrap">
                    <span className="feather-icon">
                      <Star />
                    </span>
                  </span>
                  <span className="nav-link-text">Favourites</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#trash"
                  onClick={(e) => { 
                    e.preventDefault(); 
                    getTrashedFiles();
                    localStorage.setItem('fileManagerCategory', 'trash');
                  }}
                >
                  <span className="nav-icon-wrap">
                    <span className="feather-icon">
                      <Trash2 />
                    </span>
                  </span>
                  <span className="nav-link-text">Bin</span>
                </a>
              </li>
            
            </ul>
          </div>
        </div>
      </SimpleBar>
     
     
    </nav>
  );
};

const mapStateToProps = (state) => ({
  storageInfo: state.fileManagerReducer?.storageInfo || {}
});

const mapDispatchToProps = {
  uploadFile,
  getFilesByCategory,
  getStorageInfo,
  getStarredFiles,
  getTrashedFiles
};

export default connect(mapStateToProps, mapDispatchToProps)(FmSidebar);