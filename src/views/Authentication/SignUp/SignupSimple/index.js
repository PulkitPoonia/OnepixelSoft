"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const SimpleHeader_1 = __importDefault(require("../../SimpleHeader"));
const PageFooter_1 = __importDefault(require("../../../../layout/Footer/PageFooter"));
const Body_1 = __importDefault(require("./Body"));
const SignUpSimple = () => {
    return (<div>
            <SimpleHeader_1.default />
            <div className="hk-pg-wrapper">
                <Body_1.default />
                <PageFooter_1.default />
            </div>
        </div>);
};
exports.default = SignUpSimple;
