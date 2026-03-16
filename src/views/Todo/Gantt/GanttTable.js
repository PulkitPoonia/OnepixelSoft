"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const simplebar_react_1 = __importDefault(require("simplebar-react"));
const _hk_data_table_1 = __importDefault(require("../../../components/@hk-data-table"));
const GanttData_1 = require("./GanttData");
const GanttTable = () => {
    return (<simplebar_react_1.default autoHide={false} style={{ maxHeight: "100vh" }} className="split">
            <_hk_data_table_1.default column={GanttData_1.columns} rowData={GanttData_1.data} rowSelection={true} markStarred={true} classes="table-wrap gt-todo-table nowrap"/>
        </simplebar_react_1.default>);
};
exports.default = GanttTable;
