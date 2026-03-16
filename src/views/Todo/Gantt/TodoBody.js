"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_split_1 = __importDefault(require("react-split"));
const GanttChart_1 = __importDefault(require("./GanttChart"));
const GanttTable_1 = __importDefault(require("./GanttTable"));
const gutterFn = (_index, direction) => {
    const gutter = document.createElement("div");
    gutter.className = `
    gutter
    gutter-${direction}
    flex
    items-center
    justify-center
    cursor-col-resize
  `;
    gutter.style.height = '100%';
    return gutter;
};
const TodoBody = () => {
    return (<div className="todo-body">
            <div className="nicescroll-bar">
                <react_split_1.default className="split-wrap" gutter={gutterFn} gutterSize={7}>
                    <GanttTable_1.default />
                    <GanttChart_1.default />
                </react_split_1.default>
            </div>
        </div>);
};
exports.default = TodoBody;
