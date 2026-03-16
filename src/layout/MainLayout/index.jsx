import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';
import { useMatch } from 'react-router-dom';
import { toggleCollapsedNav, sidebarDataHover } from '../../redux/action/Theme';
import { useTheme } from '../../utils/theme-provider/theme-provider';
import PageFooter from '../Footer/PageFooter';
import { useWindowWidth } from '@react-hook/window-size';
import Navbar from '../Navbar';

const CompactLayout = ({
    children,
    navCollapsed,
    topNavCollapsed,
    toggleCollapsedNav,
    sidebarDataHover,
    dataHover
}) => {

    const appRoutes = useMatch('/apps/*');
    const errro404Route = useMatch('/error-404');
    const windowWidth = useWindowWidth();

    const { theme } = useTheme();

   
    const initialMountRef = useRef(true);
    useEffect(() => {
        if (initialMountRef.current) {
            initialMountRef.current = false;
            return;
        }
        if (windowWidth < 1200) {
            toggleCollapsedNav(true);
        }
    }, [windowWidth, toggleCollapsedNav]);

    // Sync with HTML tag
    useEffect(() => {
        document.documentElement.setAttribute(
            "data-layout-style",
            navCollapsed ? "collapsed" : "default"
        );
    }, [navCollapsed]);

    return (
        <div
            className={classNames(
                "hk-wrapper",
                { "hk-pg-auth": errro404Route }
            )}
            data-layout="navbar"
            data-layout-style={navCollapsed ? "collapsed" : "default"}
            data-navbar-style={topNavCollapsed ? "collapsed" : ""}
            data-menu={theme}
            data-footer="simple"
            style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}
        >
            <Navbar />

        <div className={classNames("hk-pg-wrapper", { "pb-0": appRoutes })} style={{ flex: 1, overflow: 'auto', margin: 0, padding: '65px 0 0', paddingBottom: 0 }}>
            {children}
            {!appRoutes && <PageFooter />}
        </div>
        </div>
    );
};

const mapStateToProps = ({ theme }) => {
    const { navCollapsed, topNavCollapsed, dataHover } = theme;
    return {
        navCollapsed,
        topNavCollapsed,
        dataHover
    };
};

export default connect(
    mapStateToProps,
    { toggleCollapsedNav, sidebarDataHover }
)(CompactLayout);
