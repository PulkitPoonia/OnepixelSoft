import React, { useState } from 'react';
import { Navbar as BootstrapNavbar, Container, Nav } from 'react-bootstrap';
import { connect } from 'react-redux';
import CompactMenu from './CompactMenu';

const Navbar = ({ navCollapsed, topNavCollapsed }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <BootstrapNavbar expand="xl" className="hk-navbar navbar-light">
            <Container fluid className="ps-0 pe-0">
                <CompactMenu closeMenu={() => setShowMenu(false)} />
            </Container>
        </BootstrapNavbar>
    )
}

const mapStateToProps = ({ theme }) => {
    const { navCollapsed, topNavCollapsed } = theme;
    return { navCollapsed, topNavCollapsed }
};

export default connect(mapStateToProps)(Navbar)
