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
const simplebar_react_1 = __importDefault(require("simplebar-react"));
const react_redux_1 = require("react-redux");
const ToDo_1 = require("../../../redux/action/ToDo");
const _hk_gantt_1 = __importDefault(require("../../../components/@hk-gantt/@hk-gantt"));
const GanttChart = ({ ganttViewMode, vm }) => {
    // 👇️ scroll to viewPort every time messages change
    (0, react_1.useEffect)(() => {
        const element = document.querySelector('#split_2 .simplebar-content-wrapper');
        element.scrollTo({ left: 500, behavior: "smooth" });
    });
    const tasks = [
        {
            id: "task_1",
            name: "Draft the new contract document for sales team",
            start: "2019-07-16",
            end: "2019-07-20",
            progress: 55,
        }, {
            id: "task_2",
            name: "Find out the old contract documents",
            start: "2019-07-19",
            end: "2019-07-21",
            progress: 85,
            dependencies: "task_1"
        }, {
            id: "task_3",
            name: "Organize meeting with sales associates to understand need in detail",
            start: "2019-07-21",
            end: "2019-07-22",
            progress: 80,
            dependencies: "task_2"
        }, {
            id: "task_4",
            name: "iOS App home page",
            start: "2019-07-15",
            end: "2019-07-17",
            progress: 80
        }, {
            id: "task_5",
            name: "Write a release note",
            start: "2019-07-18",
            end: "2019-07-22",
            progress: 65,
            dependencies: "task_4"
        }, {
            id: "task_6",
            name: "Setup new sales project",
            start: "2019-07-20",
            end: "2019-07-31",
            progress: 15
        }, {
            id: "task_7",
            name: "Invite user to a project",
            start: "2019-07-25",
            end: "2019-07-26",
            progress: 99,
            dependencies: "task_6"
        }, {
            id: "task_8",
            name: "Coordinate with business development",
            start: "2019-07-28",
            end: "2019-07-30",
            progress: 35,
            dependencies: "task_7"
        }, {
            id: "task_9",
            name: "Kanban board design",
            start: "2019-08-01",
            end: "2019-08-03",
            progress: 25,
            dependencies: "task_8"
        }, {
            id: "task_10",
            name: "Enable analytics tracking",
            start: "2019-08-05",
            end: "2019-08-07",
            progress: 60,
            dependencies: "task_9"
        }
    ];
    return (<simplebar_react_1.default autoHide={false} style={{ maxHeight: "100vh" }} className="split" id="split_2">
            <div className="gantt-wrap">
                <span className="gantt-container">
                    <span className="gantt">
                        <_hk_gantt_1.default tasks={tasks} viewMode={vm} onProgressChange={(task, progress) => console.log(task, progress)} onDateChange={(task, start, end) => console.log(task, start, end)}/>
                    </span>
                </span>
            </div>
        </simplebar_react_1.default>);
};
const mapStateToProps = ({ toDoReducer }) => {
    const { vm } = toDoReducer;
    return { vm };
};
exports.default = (0, react_redux_1.connect)(mapStateToProps, { ganttViewMode: ToDo_1.ganttViewMode })(GanttChart);
