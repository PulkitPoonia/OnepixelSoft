"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_bootstrap_1 = require("react-bootstrap");
const simplebar_react_1 = __importDefault(require("simplebar-react"));
const AddNewProject = ({ show, onHide }) => {
    return (<react_bootstrap_1.Modal show={show} onHide={onHide} centered dialogClassName="mw-400p">
            <react_bootstrap_1.Modal.Header className="header-wth-bg-inv">
                <react_bootstrap_1.Modal.Title>Add Board</react_bootstrap_1.Modal.Title>
                <react_bootstrap_1.Button bsPrefix="btn-close" className="text-white" onClick={onHide}>
                    <span aria-hidden="true">×</span>
                </react_bootstrap_1.Button>
            </react_bootstrap_1.Modal.Header>
            <react_bootstrap_1.Modal.Body className="p-0">
                <div>
                    <simplebar_react_1.default className="nicescroll-bar h-350p">
                        <ul className="p-3 pb-0">
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-primary avatar-rounded">
                                            <span className="initial-wrap">J</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Onepixel Soft</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck2" defaultChecked/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-danger avatar-rounded">
                                            <span className="initial-wrap">H</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Hencework</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck3" defaultChecked/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-info avatar-rounded">
                                            <span className="initial-wrap">G</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Griffin</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck4"/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-warning avatar-rounded">
                                            <span className="initial-wrap">R</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">React - Onepixel Soft</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck5" defaultChecked/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-primary avatar-rounded">
                                            <span className="initial-wrap">P</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Pangong</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck6" defaultChecked/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-success avatar-rounded">
                                            <span className="initial-wrap">A</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Angular - Onepixel Soft</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck7" defaultChecked/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-warning avatar-rounded">
                                            <span className="initial-wrap">R</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">React - Onepixel Soft</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck8"/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-primary avatar-rounded">
                                            <span className="initial-wrap">P</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Pangong</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck9"/>
                            </li>
                            <li className="d-flex align-items-center justify-content-between mb-3">
                                <div className="media d-flex align-items-center">
                                    <div className="media-head me-2">
                                        <div className="avatar avatar-xs avatar-success avatar-rounded">
                                            <span className="initial-wrap">A</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="name">Angular - Onepixel Soft</div>
                                    </div>
                                </div>
                                <react_bootstrap_1.Form.Check type="checkbox" id="customCheck10"/>
                            </li>
                        </ul>
                    </simplebar_react_1.default>
                </div>
            </react_bootstrap_1.Modal.Body>
            <react_bootstrap_1.Modal.Footer className="justify-content-center">
                <react_bootstrap_1.Button variant="light" className="flex-1" onClick={onHide}>Cancel</react_bootstrap_1.Button>
                <react_bootstrap_1.Button variant="primary" className="flex-fill flex-1" onClick={onHide}>Add Board</react_bootstrap_1.Button>
            </react_bootstrap_1.Modal.Footer>
        </react_bootstrap_1.Modal>);
};
exports.default = AddNewProject;
