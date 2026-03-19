import React, { useState } from 'react';
import {
    Button,
    Col,
    Container,
    Form,
    InputGroup,
    Row,
    Card,
    Spinner
} from 'react-bootstrap';

import { ExternalLink } from 'react-feather';
import { Link, useNavigate } from 'react-router-dom';

// Images
import BrandLight from '../../../../assets/img/mylogowhite.png';
import BrandDark from '../../../../assets/img/mylogo.png';

import { useTheme } from '../../../../utils/theme-provider/theme-provider';

// Socket
import socketService from '../../../../utils/socketService';

const Login = () => {

    const { theme } = useTheme();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    const apiBase =
        import.meta.env.VITE_API_BASE || 'http://localhost:4000';

    /* ================= VALIDATION ================= */
    const validate = () => {
        const e = {};

        if (!username.trim()) e.username = 'Enter username or email';
        if (!password.trim()) e.password = 'Enter password';

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    /* ================= LOGIN ================= */
    const handleSubmit = async (e) => {

        e.preventDefault();
        if (!validate()) return;

        setLoading(true);

        try {
            const payload = {
                username: username.trim(),
                password: password.trim()
            };

            const endpoint = isAdminLogin ? '/admin/login' : '/api/login';

            console.log("LOGIN TYPE:", isAdminLogin ? "ADMIN" : "USER");
            console.log("ENDPOINT:", endpoint);
            console.log("SENDING LOGIN:", payload);

            const res = await fetch(`${apiBase}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            console.log('LOGIN RESPONSE:', json);

            if (json?.ok && json?.accessToken) {

                /* ================= CLEAR OLD ================= */
                localStorage.clear();

                /* ================= SAVE TOKENS ================= */
                if (json.user?.role === "admin") {
                    localStorage.setItem("adminToken", json.accessToken);
                } else {
                    localStorage.setItem("accessToken", json.accessToken);
                }

                if (json.refreshToken) {
                    localStorage.setItem('refreshToken', json.refreshToken);
                }

                /* ================= SAVE ROLE ================= */
                const role = json.user?.role || 'user';
                localStorage.setItem('role', role);

                /* ================= SAVE USER ================= */
                localStorage.setItem(
                    'user',
                    JSON.stringify({
                        _id: json.user?._id,
                        username: json.user?.username,
                        name: json.user?.name,
                        email: json.user?.email,
                        profilePic:
                            json.user?.profilePic ||
                            json.user?.avatar ||
                            '',
                        role
                    })
                );

                console.log('✅ Login success:', role);

                /* ================= CONNECT SOCKET ================= */
                socketService.connect();

                /* ================= REDIRECT ================= */
                if (role === 'admin') {
                    // Always redirect admin to dashboard
                    navigate('/admin/dashboard', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }

                return;
            }

            setErrors({
                form: json?.error || 'Login failed. Please try again.'
            });

        } catch (err) {
            console.error('Login error:', err);
            setErrors({
                form: 'An unexpected error occurred. Please try again later.'
            });
        } finally {
            setLoading(false);
        }
    };

    /* ================= UI ================= */

    return (
        <div className="hk-pg-wrapper py-0">
            <div className="hk-pg-body py-0">
                <Container fluid>
                    <Row className="justify-content-center align-items-center min-vh-100">
                        <Col xs={12} sm={10} md={6} lg={5} xl={4}>
                            <div className="auth-card">

                                {/* Logo */}
                                <div className="text-center mb-4">
                                    <img
                                        src={theme === 'dark' ? BrandLight : BrandDark}
                                        alt="logo"
                                        style={{ height: '70px' }}
                                    />
                                </div>

                                <Card>
                                    <Card.Body>

                                        <h4>Welcome Back</h4>
                                        <p className="text-muted mb-3">
                                            Sign in to continue
                                        </p>

                                        {errors.form && (
                                            <div className="alert alert-danger">
                                                {errors.form}
                                            </div>
                                        )}

                                        <Form onSubmit={handleSubmit}>

                                            <Form.Group className="mb-3">
                                                <Form.Label>Username / Email</Form.Label>
                                                <Form.Control
                                                    value={username}
                                                    isInvalid={!!errors.username}
                                                    onChange={e => setUsername(e.target.value)}
                                                />
                                            </Form.Group>

                                            <Form.Group className="mb-3">
                                                <Form.Label>Password</Form.Label>

                                                <InputGroup>
                                                    <Form.Control
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={password}
                                                        isInvalid={!!errors.password}
                                                        onChange={e => setPassword(e.target.value)}
                                                    />

                                                    <Button
                                                        type="button"
                                                        variant="light"
                                                        onClick={() => setShowPassword(v => !v)}
                                                    >
                                                        {showPassword ? 'Hide' : 'Show'}
                                                    </Button>
                                                </InputGroup>
                                            </Form.Group>

                                            <div className="d-flex justify-content-between">
                                                <Form.Check label="Keep me logged in" defaultChecked />

                                                <Button type="submit" disabled={loading}>
                                                    {loading
                                                        ? <Spinner size="sm" />
                                                        : isAdminLogin ? 'Admin Login' : 'User Login'}
                                                </Button>
                                            </div>

                                        </Form>

                                    </Card.Body>
                                </Card>

                                <div className="text-center mt-3">
                                    <Link to="#" className="text-muted">
                                        <ExternalLink size={14} />
                                        <span className="ms-1">Need help?</span>
                                    </Link>
                                </div>

                                {/* 🔥 FIXED BUTTONS */}
                                <div className="d-flex justify-content-center mb-4">
                                    <Button
                                        type="button"
                                        variant={!isAdminLogin ? "primary" : "outline-primary"}
                                        onClick={() => setIsAdminLogin(false)}
                                    >
                                        User Login
                                    </Button>

                                    <Button
                                        type="button"
                                        className="ms-2"
                                        variant={isAdminLogin ? "primary" : "outline-primary"}
                                        onClick={() => setIsAdminLogin(true)}
                                    >
                                        Admin Login
                                    </Button>
                                </div>

                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    );
};

export default Login;