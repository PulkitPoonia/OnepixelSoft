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
const react_1 = __importStar(require("react"));
const react_bootstrap_1 = require("react-bootstrap");
const simplebar_react_1 = __importDefault(require("simplebar-react"));
const Icons = __importStar(require("react-feather"));
const react_router_dom_1 = require("react-router-dom");
const HkTooltip_1 = __importDefault(require("../../../components/@hk-tooltip/HkTooltip"));
const AddNewProject_1 = __importDefault(require("./AddNewProject"));
const AddNewTask_1 = __importDefault(require("../AddNewTask"));
const _hk_badge_1 = __importDefault(require("../../../components/@hk-badge/@hk-badge"));
const TodoAppSidebar = () => {
    const [addNewTask, setAddNewTask] = (0, react_1.useState)(false);
    const [addNewBoard, setAddNewBoard] = (0, react_1.useState)(false);
    return (<>
            <nav className="todoapp-sidebar">
                <simplebar_react_1.default className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        <react_bootstrap_1.Button variant="primary" className="btn-rounded btn-block mb-4" onClick={() => setAddNewTask(!addNewTask)}>Add Task</react_bootstrap_1.Button>
                        <div className="menu-group">
                            <react_bootstrap_1.Nav className="nav-light navbar-nav flex-column">
                                <react_bootstrap_1.Nav.Item className="active">
                                    <react_bootstrap_1.Nav.Link>
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Icons.GitPullRequest />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Gantt</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link>
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Icons.List />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">My Tasks</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link>
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Icons.Calendar />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Calendar</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link>
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Icons.File />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Files</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link>
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Icons.Activity />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Activity</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                            </react_bootstrap_1.Nav>
                        </div>
                        <div className="separator separator-light"/>
                        <div className="title-sm text-primary">Priority</div>
                        <div className="menu-group">
                            <react_bootstrap_1.Nav className="nav-light navbar-nav flex-column">
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link className="link-with-badge">
                                        <_hk_badge_1.default indicator bg="danger" className="badge-indicator-lg me-2"/>
                                        <span className="nav-link-text">Urgent</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link className="link-with-badge">
                                        <_hk_badge_1.default indicator bg="orange" className="badge-indicator-lg me-2"/>
                                        <span className="nav-link-text">High</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link className="link-with-badge">
                                        <_hk_badge_1.default indicator bg="yellow" className="badge-indicator-lg me-2"/>
                                        <span className="nav-link-text">Medium</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <react_bootstrap_1.Nav.Link className="link-with-badge">
                                        <_hk_badge_1.default indicator bg="gold" className="badge-indicator-lg me-2"/>
                                        <span className="nav-link-text">Low</span>
                                    </react_bootstrap_1.Nav.Link>
                                </react_bootstrap_1.Nav.Item>
                            </react_bootstrap_1.Nav>
                        </div>
                        <div className="separator separator-light"/>
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="title-sm text-primary mb-0">Projects</div>
                            <react_router_dom_1.Link to="#" className="btn btn-xs btn-icon btn-rounded btn-light" onClick={() => setAddNewBoard(!addNewBoard)}>
                                <HkTooltip_1.default placement="top" title="Add Project">
                                    <span className="icon">
                                        <span className="feather-icon">
                                            <Icons.Plus />
                                        </span>
                                    </span>
                                </HkTooltip_1.default>
                            </react_router_dom_1.Link>
                        </div>
                        <div className="menu-group">
                            <react_bootstrap_1.Nav className="nav-light navbar-nav flex-column">
                                <react_bootstrap_1.Nav.Item>
                                    <div>
                                        <div className="media d-flex align-items-center">
                                            <div className="media-head me-2">
                                                <div className="avatar avatar-xs avatar-primary avatar-rounded">
                                                    <span className="initial-wrap">J</span>
                                                </div>
                                            </div>
                                            <div className="media-body">
                                                <div>
                                                    <div className="name">Onepixel Soft</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ms-auto">
                                            <react_bootstrap_1.Button variant='flush-light' size="sm" className="btn-icon btn-rounded flush-soft-hover">
                                                <span className="icon">
                                                    <span className="feather-icon">
                                                        <Icons.Lock />
                                                    </span>
                                                </span>
                                            </react_bootstrap_1.Button>
                                            <react_bootstrap_1.Button variant='flush-light' size="sm" className="btn-icon btn-rounded flush-soft-hover">
                                                <span className="icon">
                                                    <span className="feather-icon">
                                                        <Icons.MoreVertical />
                                                    </span>
                                                </span>
                                            </react_bootstrap_1.Button>
                                        </div>
                                    </div>
                                </react_bootstrap_1.Nav.Item>
                                <react_bootstrap_1.Nav.Item>
                                    <div>
                                        <div className="media d-flex align-items-center">
                                            <div className="media-head me-2">
                                                <div className="avatar avatar-xs avatar-pink avatar-rounded">
                                                    <span className="initial-wrap">H</span>
                                                </div>
                                            </div>
                                            <div className="media-body">
                                                <div>
                                                    <div className="name">Hencework</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ms-auto">
                                            <react_bootstrap_1.Button variant='flush-light' size="sm" className="btn-icon btn-rounded flush-soft-hover">
                                                <span className="icon">
                                                    <span className="feather-icon">
                                                        <Icons.Globe />
                                                    </span>
                                                </span>
                                            </react_bootstrap_1.Button>
                                            <react_bootstrap_1.Button variant='flush-light' size="sm" className="btn-icon btn-rounded flush-soft-hover">
                                                <span className="icon">
                                                    <span className="feather-icon">
                                                        <Icons.MoreVertical />
                                                    </span>
                                                </span>
                                            </react_bootstrap_1.Button>
                                        </div>
                                    </div>
                                </react_bootstrap_1.Nav.Item>
                            </react_bootstrap_1.Nav>
                        </div>
                    </div>
                </simplebar_react_1.default>
                {/*Sidebar Fixnav*/}
                <div className="todoapp-fixednav">
                    <div className="hk-toolbar">
                        <react_bootstrap_1.Nav className="nav-light">
                            <react_bootstrap_1.Nav.Item className="nav-link">
                                <react_bootstrap_1.Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip_1.default id="tooltip2" placement="top" title="Settings">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Icons.Settings />
                                            </span>
                                        </span>
                                    </HkTooltip_1.default>
                                </react_bootstrap_1.Button>
                            </react_bootstrap_1.Nav.Item>
                            <react_bootstrap_1.Nav.Item className="nav-link">
                                <react_bootstrap_1.Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip_1.default id="tooltip3" placement="top" title="Archive">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Icons.Archive />
                                            </span>
                                        </span>
                                    </HkTooltip_1.default>
                                </react_bootstrap_1.Button>
                            </react_bootstrap_1.Nav.Item>
                            <react_bootstrap_1.Nav.Item className="nav-link">
                                <react_bootstrap_1.Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip_1.default id="tooltip2" placement="top" title="Help">
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Icons.Book />
                                            </span>
                                        </span>
                                    </HkTooltip_1.default>
                                </react_bootstrap_1.Button>
                            </react_bootstrap_1.Nav.Item>
                        </react_bootstrap_1.Nav>
                    </div>
                </div>
                {/*/ Sidebar Fixnav*/}
            </nav>
            <AddNewTask_1.default show={addNewTask} hide={() => setAddNewTask(false)}/>
            <AddNewProject_1.default show={addNewBoard} onHide={() => setAddNewBoard(false)}/>
        </>);
};
exports.default = TodoAppSidebar;
