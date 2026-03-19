import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row
} from 'react-bootstrap';
import CommanFooter1 from '../../CommanFooter1';

import jampackImg from '../../../../assets/img/logo-light.svg';
import jampackImgDark from '../../../../assets/img/logo-dark.svg';
import { useTheme } from '../../../../utils/theme-provider/theme-provider';

const SignupClassic = () => {
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState({}); // ✅ FIXED

  const navigate = useNavigate(); // ✅ FIXED

  const apiBase =
    import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = {};
    if (!username) errs.username = 'Username is required';
    if (!email) errs.email = 'Email is required';
    if (!password || password.length < 6)
      errs.password = 'Password must be at least 6 characters';

    setErrors(errs);

    if (Object.keys(errs).length) return;

    try {
      const res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password })
      });

      const json = await res.json();

      if (json?.ok) {
        navigate('/auth/login-classic', { replace: true }); // ✅ FIXED
      } else {
        alert(json?.error || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      alert('Signup failed');
    }
  };

  const { theme } = useTheme();

  return (
    <div className="hk-pg-wrapper pt-0 pb-xl-0 pb-5">
      <div className="hk-pg-body pt-0 pb-xl-0">
        <Container>
          <Row>
            <Col sm={10} className="position-relative mx-auto">
              <div className="auth-content py-8">
                <Form className="w-100" onSubmit={handleSubmit}>
                  <Row>
                    <Col
                      xxl={5}
                      xl={7}
                      lg={8}
                      sm={10}
                      className="mx-auto"
                    >
                      <div className="text-center mb-7">
                        <Link className="navbar-brand me-0" to="/">
                          {theme === 'light' ? (
                            <img src={jampackImg} alt="brand" />
                          ) : (
                            <img src={jampackImgDark} alt="brand" />
                          )}
                        </Link>
                      </div>

                      <Card className="card-border">
                        <Card.Body>
                          <h4 className="text-center mb-0">
                            Sign Up to Onepixel Soft
                          </h4>

                          <p className="text-center mt-2 mb-4">
                            Already a member ?{' '}
                            <Link to="/auth/login-classic">
                              <u>Sign In</u>
                            </Link>
                          </p>

                          {/* Inputs */}
                          <Row className="gx-3">
                            <Col lg={6} className="mb-3">
                              <Form.Label>Name</Form.Label>
                              <Form.Control
                                value={name}
                                onChange={e => setName(e.target.value)}
                              />
                            </Col>

                            <Col lg={6} className="mb-3">
                              <Form.Label>Username</Form.Label>
                              <Form.Control
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                isInvalid={!!errors.username}
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.username}
                              </Form.Control.Feedback>
                            </Col>

                            <Col lg={12} className="mb-3">
                              <Form.Label>Email</Form.Label>
                              <Form.Control
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                isInvalid={!!errors.email}
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.email}
                              </Form.Control.Feedback>
                            </Col>

                            <Col lg={12} className="mb-3">
                              <Form.Label>Password</Form.Label>
                              <InputGroup>
                                <Form.Control
                                  type={showPassword ? 'text' : 'password'}
                                  value={password}
                                  onChange={e =>
                                    setPassword(e.target.value)
                                  }
                                  isInvalid={!!errors.password}
                                />
                                <Button
                                  variant="outline-secondary"
                                  onClick={() =>
                                    setShowPassword(!showPassword)
                                  }
                                >
                                  {showPassword ? 'Hide' : 'Show'}
                                </Button>
                                <Form.Control.Feedback type="invalid">
                                  {errors.password}
                                </Form.Control.Feedback>
                              </InputGroup>
                            </Col>
                          </Row>

                          <Button
                            type="submit"
                            className="btn-rounded btn-block mt-3"
                          >
                            Create account
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <CommanFooter1 />
    </div>
  );
};

export default SignupClassic;
