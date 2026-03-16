import React from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import SimpleHeader from '../SimpleHeader';
import PageFooter from '../../../layout/Footer/PageFooter';
import { useNavigate } from 'react-router-dom';

const Error503 = (props) => {
    
    // Return to home page
    const navigate = useNavigate();
    const handleReturn = () => {
       navigate('/')

    }

    return (
        <>
            <SimpleHeader />
            <div className="hk-pg-wrapper">
                <div className="hk-pg-body">
                    <Container>
                        <Row>
                            <Col xl={7} lg={6} className="d-lg-block d-none">
                                <div className="auth-content py-md-0 py-8">
                                    <Row>
                                        <Col xl={12} className="text-center">
                                            <p className="p-xs mt-5 text-light">Server Error 503</p>
                                        </Col>
                                    </Row>
                                </div>
                            </Col>
                            <Col xl={5} lg={6} md={7} sm={10}>
                                <div className="auth-content py-md-0 py-8">
                                    <div className="w-100">
                                        <Row>
                                            <Col xxl={9} xl={8} lg={11}>
                                                <h1 className="display-4 fw-bold mb-2">503</h1>
                                                <p>Server is temporarily unable to handle the request. This may be due to the server being overloaded or down for maintenance.</p>
                                                <Button variant="primary" className="mt-4" onClick={handleReturn} >Return to App</Button>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
                {/* Page Footer */}
                <PageFooter />
            </div>
        </>

    )
}

export default Error503
