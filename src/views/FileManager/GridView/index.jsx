import classNames from 'classnames';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import FmSidebar from '../FmSidebar';
import FmGrid from './FmGrid';
import { 
  getFilesByCategory,
  getStarredFiles,
  getTrashedFiles 
} from '../../../redux/action/FileManager';

const GridView = () => {
    const [showSidebar, setShowSidebar] = useState(true);
    const dispatch = useDispatch();
    const { loading, error, files, currentCategory } = useSelector(state => state.fileManagerReducer || {});

    useEffect(() => {
        // Load previously selected category or default to images
        const savedCategory = localStorage.getItem('fileManagerCategory') || 'images';
        console.log('GridView mounted, loading category:', savedCategory);
        
        // Handle special categories
        if (savedCategory === 'starred') {
            dispatch(getStarredFiles());
        } else if (savedCategory === 'trash') {
            dispatch(getTrashedFiles());
        } else {
            // Handle standard categories: images, videos, documents
            dispatch(getFilesByCategory(savedCategory));
        }
    }, [dispatch]);

    if (error) {
        return (
            <div className="hk-pg-body py-0">
                <div style={{ padding: '20px', color: 'red' }}>
                    <h3>Error Loading Files</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="hk-pg-body py-0">
            <div className={classNames("fmapp-wrap", { "fmapp-sidebar-toggle": !showSidebar })}>
                <FmSidebar />
                <div className="fmapp-content">
                    <div className="fmapp-detail-wrap">
                        <FmGrid currentCategory={currentCategory} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GridView
