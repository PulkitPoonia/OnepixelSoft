import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE as apiBase } from '../../../../config';
import CommanFooter1 from '../../CommanFooter1';
import { useTheme } from '../../../../utils/theme-provider/theme-provider';

//Images
import jampackImg from '../../../../assets/img/logo-light.svg';
import jampackImgDark from '../../../../assets/img/logo-dark.svg';

import signupBg from '../../../../assets/img/signup-bg.jpg';
import slide1 from '../../../../assets/img/slide1.jpg';
import slide2 from '../../../../assets/img/slide2.jpg';

const Signup = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();


    const validate = () => {
        const e = {};
        if (!username) e.username = 'Please enter a username';
        if (!email) e.email = 'Please enter an email';
        if (!password || password.length < 6) e.password = 'Password must be at least 6 characters';
        return e;
    }

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length === 0) {
            try {
                setSubmitting(true);
                const res = await fetch(`${apiBase}/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, username, email, password })
                });
                const json = await res.json();
                if (json?.ok) {
                    alert('Signup successful!');
                    navigate('/auth/login', { replace: true });
                } else {
                    alert(json.error || 'Signup failed');
                }
            } catch {
                alert('Signup failed');
            } finally {
                setSubmitting(false);
            }
        }
    }

    return (
        <div className="hk-pg-wrapper py-5">
            <Container>
                <Row className="justify-content-center">
                    <Col sm={10} md={8} lg={6}>
                        <Card className="shadow-sm">
                            <Card.Body className="p-4">
                                <div className="text-center mb-4">
                                    <h3 className="mb-1">Create your account</h3>
                                    <p className="text-muted mb-0">Create an account to get started</p>
                                </div>
                                <Form onSubmit={handleSubmit} noValidate>
                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Name</Form.Label>
                                                <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Username</Form.Label>
                                                <Form.Control value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" isInvalid={!!errors.username} />
                                                <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Email</Form.Label>
                                                <Form.Control value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" type="email" isInvalid={!!errors.email} />
                                                <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col md={12} className="mb-3">
                                            <Form.Group>
                                                <Form.Label>Password</Form.Label>
                                                <InputGroup>
                                                    <Form.Control value={password} onChange={e => setPassword(e.target.value)} placeholder="6+ characters" type={showPassword ? 'text' : 'password'} isInvalid={!!errors.password} />
                                                    <Button variant="outline-secondary" onClick={() => setShowPassword(s => !s)} type="button">{showPassword ? 'Hide' : 'Show'}</Button>
                                                    <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                                                </InputGroup>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    {errors.form && <div className="text-danger mb-3">{errors.form}</div>}
                                    <div className="d-grid mb-3">
                                        <Button type="submit" variant="primary" disabled={submitting}>
                                            {submitting ? <><Spinner animation="border" size="sm" className="me-2"/> Creating...</> : 'Create account'}
                                        </Button>
                                    </div>
                                    <div className="text-center">
                                        <small className="text-muted">By creating an account you agree to our <Link to="#">Terms</Link> and <Link to="#">Privacy Policy</Link>.</small>
                                    </div>
                                    <hr />
                                    <div className="text-center">
                                        <span>Already a member? </span><Link to="/auth/login">Sign in</Link>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    )
}

export default Signup
