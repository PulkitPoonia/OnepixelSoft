import React from 'react';
import { connect } from 'react-redux';
import { sidebarDataHover, toggleCollapsedNav } from '../../redux/action/Theme';
import { Link } from 'react-router-dom';
import { ArrowBarToLeft } from 'tabler-icons-react';
import { Button } from 'react-bootstrap';
import { useTheme } from '../../utils/theme-provider/theme-provider';

// Your Logos
import BrandLight from '../../assets/img/mylogowhite.png'; // for dark mode
import BrandDark from '../../assets/img/mylogo.png';       // for light mode

const NavHeader = ({ navCollapsed, toggleCollapsedNav, sidebarDataHover, dataHover }) => {

  const { theme } = useTheme();

  const toggleSidebar = () => {
    toggleCollapsedNav(!navCollapsed);

    setTimeout(() => {
      sidebarDataHover(!dataHover);
    }, 250);

    document.getElementById('tggl-btn')?.blur();
  };

  return (
    <div className="menu-header d-xl-none">
      <span>
        <Link className="navbar-brand" to="/dashboard">
          <img
            src={theme === 'dark' ? BrandLight : BrandDark}
            alt="brand"
            className="brand-img"
            style={{
              height: '55px',
              width: 'auto',
              objectFit: 'contain',
              cursor: 'pointer'
            }}
          />
        </Link>

        <Button
          id="tggl-btn"
          variant="flush-dark"
          onClick={toggleSidebar}
          className="btn-icon btn-rounded flush-soft-hover navbar-toggle"
        >
          <span className="icon">
            <span className="svg-icon fs-5">
              <ArrowBarToLeft />
            </span>
          </span>
        </Button>
      </span>
    </div>
  );
};

const mapStateToProps = ({ theme }) => {
  const { navCollapsed, dataHover } = theme;
  return { navCollapsed, dataHover };
};

export default connect(mapStateToProps, {
  toggleCollapsedNav,
  sidebarDataHover
})(NavHeader);
