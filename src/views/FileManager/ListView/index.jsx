import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import FmList from './FmList';
import FmSidebar from '../FmSidebar';
import classNames from 'classnames';
import { loadFiles } from '../../../redux/action/FileManager';

const ListView = () => {
    const [showSidebar, setShowSidebar] = useState(true);
    const dispatch = useDispatch();
    const { loading, error, files } = useSelector(state => state.fileManagerReducer || {});

    useEffect(() => {
        console.log('ListView mounted, loading files...');
        dispatch(loadFiles());
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
                        <FmList />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListView
