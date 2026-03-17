import React, { useState } from 'react';
import BootstrapNavbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
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
