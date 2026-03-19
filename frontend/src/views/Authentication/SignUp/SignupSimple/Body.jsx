import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { faFacebook, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Row
} from 'react-bootstrap';

const Body = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate(); // ✅ FIXED

  const apiBase =
    import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${apiBase}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password })
      });

      const json = await res.json();

      if (json?.ok) {
        navigate('/auth/login-simple', { replace: true }); // ✅ FIXED
      } else {
        alert(json?.error || 'Signup failed');
      }
    } catch (err) {
      console.error(err);
      alert('Signup failed');
    }
  };

  return (
    <div className="hk-pg-body">
      <Container>
        <Row className="justify-content-center">
          <Col sm={10} md={8} lg={6} className="mx-auto">
            <div className="auth-content py-8">

              <Form className="w-100" onSubmit={handleSubmit}>
                <Row>
                  <Col lg={10} className="mx-auto">

                    <h4 className="text-center mb-4">
                      Sign Up to Onepixel Soft
                    </h4>

                    {/* Social */}
                    <Button variant="outline-dark" className="mb-3 w-100">
                      <FontAwesomeIcon icon={faGoogle} /> Sign Up with Gmail
                    </Button>

                    <Button variant="primary" className="mb-3 w-100">
                      <FontAwesomeIcon icon={faFacebook} /> Sign Up with Facebook
                    </Button>

                    <div className="text-center my-3">Or</div>

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
                        />
                      </Col>

                      <Col lg={12} className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                      </Col>

                      <Col lg={12} className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() =>
                              setShowPassword(!showPassword)
                            }
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </Button>
                        </InputGroup>
                      </Col>
                    </Row>

                    {/* Submit */}
                    <Button type="submit" className="w-100 mt-3">
                      Create account
                    </Button>

                    <p className="text-center mt-3">
                      Already a member?{' '}
                      <Link to="/auth/login-simple">
                        <u>Sign In</u>
                      </Link>
                    </p>

                  </Col>
                </Row>
              </Form>

            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Body;
