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
const classnames_1 = __importDefault(require("classnames"));
const AppHeader_1 = __importDefault(require("./AppHeader"));
const TodoAppSidebar_1 = __importDefault(require("./TodoAppSidebar"));
const TodoBody_1 = __importDefault(require("./TodoBody"));
const Gantt = () => {
    const [showSidebar, setShowSidebar] = (0, react_1.useState)(false);
    return (<div className="hk-pg-body py-0">
            <div className={(0, classnames_1.default)("todoapp-wrap ganttapp-wrap full-screenapp", { "todoapp-sidebar-toggle": showSidebar })}>
                <TodoAppSidebar_1.default />
                <div className="todoapp-content">
                    <div className="todoapp-detail-wrap">
                        <AppHeader_1.default toggleSidebar={() => setShowSidebar(!showSidebar)} showSidebar={showSidebar}/>
                        <TodoBody_1.default />
                    </div>
                </div>
            </div>
        </div>);
};
exports.default = Gantt;
