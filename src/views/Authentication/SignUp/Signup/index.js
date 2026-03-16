"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const free_brands_svg_icons_1 = require("@fortawesome/free-brands-svg-icons");
const react_fontawesome_1 = require("@fortawesome/react-fontawesome");
const react_1 = __importStar(require("react"));
const react_bootstrap_1 = require("react-bootstrap");
const react_router_dom_1 = require("react-router-dom");
const CommanFooter1_1 = __importDefault(require("../../CommanFooter1"));
const theme_provider_1 = require("../../../../utils/theme-provider/theme-provider");
//Images
const logo_light_svg_1 = __importDefault(require("../../../../assets/img/logo-light.svg"));
const logo_dark_svg_1 = __importDefault(require("../../../../assets/img/logo-dark.svg"));
const signup_bg_jpg_1 = __importDefault(require("../../../../assets/img/signup-bg.jpg"));
const slide1_jpg_1 = __importDefault(require("../../../../assets/img/slide1.jpg"));
const slide2_jpg_1 = __importDefault(require("../../../../assets/img/slide2.jpg"));
const Signup = () => {
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [name, setName] = (0, react_1.useState)('');
    const [username, setUsername] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [errors, setErrors] = (0, react_1.useState)({});
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
    const validate = () => {
        const e = {};
        if (!username)
            e.username = 'Please enter a username';
        if (!email)
            e.email = 'Please enter an email';
        if (!password || password.length < 6)
            e.password = 'Password must be at least 6 characters';
        return e;
    };
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
                if (json === null || json === void 0 ? void 0 : json.ok) {
                    alert('Signup successful!');
                    navigate('/auth/login', { replace: true });
                }
                else {
                    alert(json.error || 'Signup failed');
                }
            }
            catch {
                alert('Signup failed');
            }
            finally {
                setSubmitting(false);
            }
        }
    };
    return (<div className="hk-pg-wrapper py-5">
            <react_bootstrap_1.Container>
                <react_bootstrap_1.Row className="justify-content-center">
                    <react_bootstrap_1.Col sm={10} md={8} lg={6}>
                        <react_bootstrap_1.Card className="shadow-sm">
                            <react_bootstrap_1.Card.Body className="p-4">
                                <div className="text-center mb-4">
                                    <h3 className="mb-1">Create your account</h3>
                                    <p className="text-muted mb-0">Create an account to get started</p>
                                </div>
                                <react_bootstrap_1.Form onSubmit={handleSubmit} noValidate>
                                    <react_bootstrap_1.Row>
                                        <react_bootstrap_1.Col md={6} className="mb-3">
                                            <react_bootstrap_1.Form.Group>
                                                <react_bootstrap_1.Form.Label>Name</react_bootstrap_1.Form.Label>
                                                <react_bootstrap_1.Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Full name"/>
                                            </react_bootstrap_1.Form.Group>
                                        </react_bootstrap_1.Col>
                                        <react_bootstrap_1.Col md={6} className="mb-3">
                                            <react_bootstrap_1.Form.Group>
                                                <react_bootstrap_1.Form.Label>Username</react_bootstrap_1.Form.Label>
                                                <react_bootstrap_1.Form.Control value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" isInvalid={!!errors.username}/>
                                                <react_bootstrap_1.Form.Control.Feedback type="invalid">{errors.username}</react_bootstrap_1.Form.Control.Feedback>
                                            </react_bootstrap_1.Form.Group>
                                        </react_bootstrap_1.Col>
                                        <react_bootstrap_1.Col md={12} className="mb-3">
                                            <react_bootstrap_1.Form.Group>
                                                <react_bootstrap_1.Form.Label>Email</react_bootstrap_1.Form.Label>
                                                <react_bootstrap_1.Form.Control value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" type="email" isInvalid={!!errors.email}/>
                                                <react_bootstrap_1.Form.Control.Feedback type="invalid">{errors.email}</react_bootstrap_1.Form.Control.Feedback>
                                            </react_bootstrap_1.Form.Group>
                                        </react_bootstrap_1.Col>
                                        <react_bootstrap_1.Col md={12} className="mb-3">
                                            <react_bootstrap_1.Form.Group>
                                                <react_bootstrap_1.Form.Label>Password</react_bootstrap_1.Form.Label>
                                                <react_bootstrap_1.InputGroup>
                                                    <react_bootstrap_1.Form.Control value={password} onChange={e => setPassword(e.target.value)} placeholder="6+ characters" type={showPassword ? 'text' : 'password'} isInvalid={!!errors.password}/>
                                                    <react_bootstrap_1.Button variant="outline-secondary" onClick={() => setShowPassword(s => !s)} type="button">{showPassword ? 'Hide' : 'Show'}</react_bootstrap_1.Button>
                                                    <react_bootstrap_1.Form.Control.Feedback type="invalid">{errors.password}</react_bootstrap_1.Form.Control.Feedback>
                                                </react_bootstrap_1.InputGroup>
                                            </react_bootstrap_1.Form.Group>
                                        </react_bootstrap_1.Col>
                                    </react_bootstrap_1.Row>
                                    {errors.form && <div className="text-danger mb-3">{errors.form}</div>}
                                    <div className="d-grid mb-3">
                                        <react_bootstrap_1.Button type="submit" variant="primary" disabled={submitting}>
                                            {submitting ? <><react_bootstrap_1.Spinner animation="border" size="sm" className="me-2"/> Creating...</> : 'Create account'}
                                        </react_bootstrap_1.Button>
                                    </div>
                                    <div className="text-center">
                                        <small className="text-muted">By creating an account you agree to our <react_router_dom_1.Link to="#">Terms</react_router_dom_1.Link> and <react_router_dom_1.Link to="#">Privacy Policy</react_router_dom_1.Link>.</small>
                                    </div>
                                    <hr />
                                    <div className="text-center">
                                        <span>Already a member? </span><react_router_dom_1.Link to="/auth/login">Sign in</react_router_dom_1.Link>
                                    </div>
                                </react_bootstrap_1.Form>
                            </react_bootstrap_1.Card.Body>
                        </react_bootstrap_1.Card>
                    </react_bootstrap_1.Col>
                </react_bootstrap_1.Row>
            </react_bootstrap_1.Container>
        </div>);
};
exports.default = Signup;
