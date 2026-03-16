export { default } from './ChatInfo.jsx';
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const react_bootstrap_1 = require("react-bootstrap");
const simplebar_react_1 = __importDefault(require("simplebar-react"));
const react_fontawesome_1 = require("@fortawesome/react-fontawesome");
const react_feather_1 = require("react-feather");
const free_brands_svg_icons_1 = require("@fortawesome/free-brands-svg-icons");
//Image
const avatar2_jpg_1 = __importDefault(require("../../../assets/img/avatar2.jpg"));
const ChatInfo = ({ infoToggle }) => {
    return (<div className="chat-info">
            <simplebar_react_1.default className="nicescroll-bar">
                <react_bootstrap_1.Button bsPrefix=" btn-close" className="info-close" onClick={infoToggle}>
                    <span aria-hidden="true">×</span>
                </react_bootstrap_1.Button>
                <div className="text-center">
                    <div className="avatar avatar-xxl avatar-rounded">
                        <img src={avatar2_jpg_1.default} alt="user" className="avatar-img"/>
                    </div>
                    <div className="cp-name text-truncate mt-2">Alan Rickman</div>
                    <p className="text-truncate">Today I don't feel like doing anything.. I just wanna laying in my bed</p>
                </div>
                <div className="mt-4">
                    <react_bootstrap_1.Form role="search">
                        <react_bootstrap_1.Form.Control type="text" placeholder="Search in conversation"/>
                    </react_bootstrap_1.Form>
                    <div className="collapse-simple mt-3">
                        <react_bootstrap_1.Card>
                            <react_bootstrap_1.Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#gn_info" aria-expanded="true">General Info</a>
                            </react_bootstrap_1.Card.Header>
                            <div id="gn_info" className="collapse show">
                                <react_bootstrap_1.Card.Body>
                                    <ul className="cp-info">
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <react_feather_1.Briefcase />
                                                </span></span>
                                                Co-Founder
                                            </react_router_dom_1.Link>
                                        </li>
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <react_feather_1.Mail />
                                                </span></span>
                                                <span className="text-primary">contact@hencework.com</span>
                                            </react_router_dom_1.Link>
                                        </li>
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <react_feather_1.Phone />
                                                </span></span>
                                                +91-25-4125-2365
                                            </react_router_dom_1.Link>
                                        </li>
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <react_feather_1.MapPin />
                                                </span></span>
                                                Oslo, Canada
                                            </react_router_dom_1.Link>
                                        </li>
                                    </ul>
                                </react_bootstrap_1.Card.Body>
                            </div>
                        </react_bootstrap_1.Card>
                        <react_bootstrap_1.Card>
                            <react_bootstrap_1.Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#social_profile" aria-expanded="true">Social Profile </a>
                            </react_bootstrap_1.Card.Header>
                            <div id="social_profile" className="collapse show">
                                <react_bootstrap_1.Card.Body>
                                    <ul className="hk-list hk-list-sm">
                                        <li>
                                            <react_bootstrap_1.Button variant="primary" className="btn-icon btn-rounded"><span className="icon">
                                                <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faFacebook}/>
                                            </span></react_bootstrap_1.Button>
                                        </li>
                                        <li>
                                            <react_bootstrap_1.Button variant="warning" className="btn-icon btn-rounded"><span className="icon">
                                                <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faGoogleDrive}/>
                                            </span></react_bootstrap_1.Button>
                                        </li>
                                        <li>
                                            <react_bootstrap_1.Button variant="info" className="btn-icon btn-rounded"><span className="icon">
                                                <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faDropbox}/>
                                            </span></react_bootstrap_1.Button>
                                        </li>
                                        <li>
                                            <react_bootstrap_1.Button variant="dark" className="btn-icon btn-rounded"><span className="icon">
                                                <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faGithub}/>
                                            </span></react_bootstrap_1.Button>
                                        </li>
                                        <li>
                                            <react_bootstrap_1.Button variant="danger" className="btn-icon btn-rounded"><span className="icon">
                                                <react_fontawesome_1.FontAwesomeIcon icon={free_brands_svg_icons_1.faGoogle}/>
                                            </span></react_bootstrap_1.Button>
                                        </li>
                                    </ul>
                                </react_bootstrap_1.Card.Body>
                            </div>
                        </react_bootstrap_1.Card>
                        <react_bootstrap_1.Card>
                            <react_bootstrap_1.Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#biography" aria-expanded="true">Biography </a>
                            </react_bootstrap_1.Card.Header>
                            <div id="biography" className="collapse show">
                                <react_bootstrap_1.Card.Body>
                                    <p>Hello there, Alan Rickman is a brilliant co-founder and a copy writer working for almost a decade for fortune 500 companies. I am well verse with multiple foreign languages and I love to produce good quality stuff. </p>
                                </react_bootstrap_1.Card.Body>
                            </div>
                        </react_bootstrap_1.Card>
                        <react_bootstrap_1.Card>
                            <react_bootstrap_1.Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#settings" aria-expanded="true">Settings </a>
                            </react_bootstrap_1.Card.Header>
                            <div id="settings" className="collapse show">
                                <react_bootstrap_1.Card.Body>
                                    <ul className="cp-action">
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                Clear Chat
                                            </react_router_dom_1.Link>
                                        </li>
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                <span className="text-danger">Block Contact</span>
                                            </react_router_dom_1.Link>
                                        </li>
                                        <li>
                                            <react_router_dom_1.Link to="#">
                                                Somthing's Wrong
                                            </react_router_dom_1.Link>
                                        </li>
                                    </ul>
                                    <react_router_dom_1.Link to="#" className="d-block text-dark fs-7 mb-10">Give feedback and report conversation</react_router_dom_1.Link>
                                </react_bootstrap_1.Card.Body>
                            </div>
                        </react_bootstrap_1.Card>
                    </div>
                </div>
            </simplebar_react_1.default>
        </div>);
};
exports.default = ChatInfo;
