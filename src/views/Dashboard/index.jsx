import React, { useEffect, useState } from 'react';
import { Container } from 'react-bootstrap';
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../redux/action/Theme';

const Dashboard = ({ navCollapsed, toggleCollapsedNav }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        toggleCollapsedNav(false);
        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
        <>
            <Container>
                <div className="hk-pg-header pt-7">
                    <div className="d-flex">
                        <div className="d-flex flex-wrap justify-content-between flex-1">
                            <div className="mb-lg-0 mb-2 me-8">
                                <h1 className="pg-title">Dashboard</h1>
                                <p>No data available</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hk-pg-body">
                    {/* Empty dashboard - no content */}
                </div>
            </Container>
        </>
    )
}

// export default Dashboard
const mapStateToProps = ({ theme }) => {
    const { navCollapsed } = theme;
    return { navCollapsed }
};

export default connect(mapStateToProps, { toggleCollapsedNav })(Dashboard);