"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimeString = exports.CHAR_TO_TIME_TABLE = exports.TIME_PARSE_REGEX = void 0;
const iter_1 = require("./iter");
exports.TIME_PARSE_REGEX = /(\d+)(ms|s|m|h|d|w|mo|y)\s*/g;
exports.CHAR_TO_TIME_TABLE = {
    ms: 1,
    s: 1_000,
    m: 1_000 * 60,
    h: 1_000 * 60 * 60,
    d: 1_000 * 60 * 60 * 24,
    w: 1_000 * 60 * 60 * 24 * 7,
    mo: 1_000 * 60 * 60 * 24 * 30,
    y: 1_000 * 60 * 60 * 24 * 365,
};
function parseTimeString(time) {
    const matches = time.matchAll(exports.TIME_PARSE_REGEX);
    return (0, iter_1.iter)(matches).reduce((s, m) => s + parseInt(m[0]) * exports.CHAR_TO_TIME_TABLE[m[1]], 0);
}
exports.parseTimeString = parseTimeString;
