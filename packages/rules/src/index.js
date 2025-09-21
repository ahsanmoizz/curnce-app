"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRule = evaluateRule;
exports.applyRules = applyRules;
const json_logic_js_1 = __importDefault(require("json-logic-js"));
function evaluateRule(whenExpr, context) {
    return !!json_logic_js_1.default.apply(whenExpr, context);
}
function applyRules(rules, ctx) {
    // deterministic: sort by priority asc then first match wins
    const sorted = rules.filter(r => r).sort((a, b) => a.priority - b.priority);
    for (const r of sorted) {
        if (evaluateRule(r.whenExpr, ctx))
            return r.thenAction;
    }
    return null;
}
