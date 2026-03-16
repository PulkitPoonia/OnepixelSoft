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
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const free_brands_svg_icons_1 = require("@fortawesome/free-brands-svg-icons");
const react_fontawesome_1 = require("@fortawesome/react-fontawesome");
const react_bootstrap_1 = require("react-bootstrap");
const Body = () => {
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [name, setName] = (0, react_1.useState)('');
    const [username, setUsername] = (0, react_1.useState)('');
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const navigate = (0, react_router_dom_1.useNavigate)(); // ✅ FIXED
    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${apiBase}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email, password })
            });
            const json = await res.json();
            if (json === null || json === void 0 ? void 0 : json.ok) {
                navigate('/auth/login-simple', { replace: true }); // ✅ FIXED
            }
            else {
                alert((json === null || json === void 0 ? void 0 : json.error) || 'Signup failed');
            }
        }
        catch (err) {
            console.error(err);
            alert('Signup failed');
        }
    };
    return (<div className="hk-pg-body">
      <react_bootstrap_1.Container>
        <react_bootstrap_1.Row className="justify-content-center">
          <react_bootstrap_1.Col sm={10} md={8} lg={6} className="mx-auto">
            <div className="auth-content py-8">

              <react_bootstrap_1.Form className="w-100" onSubmit={handleSubmit}>
                <react_bootstrap_1.Row>
                  <react_bootstrap_1.Col lg={10} className="mx-auto">

                    <h4 className="text-center mb-4">
                      Sign Up to Onepixel Soft
                    </h4>

                    {/* Social */}
                    <react_bootstrap_1.Button variant="outline-dark" className="mb-3 w-100">
                      <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faGoogle}/> Sign Up with Gmail
                    </react_bootstrap_1.Button>

                    <react_bootstrap_1.Button variant="primary" className="mb-3 w-100">
                      <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faFacebook}/> Sign Up with Facebook
                    </react_bootstrap_1.Button>

                    <div className="text-center my-3">Or</div>

                    {/* Inputs */}
                    <react_bootstrap_1.Row className="gx-3">
                      <react_bootstrap_1.Col lg={6} className="mb-3">
                        <react_bootstrap_1.Form.Label>Name</react_bootstrap_1.Form.Label>
                        <react_bootstrap_1.Form.Control value={name} onChange={e => setName(e.target.value)}/>
                      </react_bootstrap_1.Col>

                      <react_bootstrap_1.Col lg={6} className="mb-3">
                        <react_bootstrap_1.Form.Label>Username</react_bootstrap_1.Form.Label>
                        <react_bootstrap_1.Form.Control value={username} onChange={e => setUsername(e.target.value)}/>
                      </react_bootstrap_1.Col>

                      <react_bootstrap_1.Col lg={12} className="mb-3">
                        <react_bootstrap_1.Form.Label>Email</react_bootstrap_1.Form.Label>
                        <react_bootstrap_1.Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)}/>
                      </react_bootstrap_1.Col>

                      <react_bootstrap_1.Col lg={12} className="mb-3">
                        <react_bootstrap_1.Form.Label>Password</react_bootstrap_1.Form.Label>
                        <react_bootstrap_1.InputGroup>
                          <react_bootstrap_1.Form.Control type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}/>
                          <react_bootstrap_1.Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? 'Hide' : 'Show'}
                          </react_bootstrap_1.Button>
                        </react_bootstrap_1.InputGroup>
                      </react_bootstrap_1.Col>
                    </react_bootstrap_1.Row>

                    {/* Submit */}
                    <react_bootstrap_1.Button type="submit" className="w-100 mt-3">
                      Create account
                    </react_bootstrap_1.Button>

                    <p className="text-center mt-3">
                      Already a member?{' '}
                      <react_router_dom_1.Link to="/auth/login-simple">
                        <u>Sign In</u>
                      </react_router_dom_1.Link>
                    </p>

                  </react_bootstrap_1.Col>
                </react_bootstrap_1.Row>
              </react_bootstrap_1.Form>

            </div>
          </react_bootstrap_1.Col>
        </react_bootstrap_1.Row>
      </react_bootstrap_1.Container>
    </div>);
};
exports.default = Body;
