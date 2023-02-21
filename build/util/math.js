"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stdev = void 0;
function stdev(array) {
    const sum = array.reduce((a, b) => a + b, 0);
    const inner = array.reduce((a, b) => a + (sum - b) ** 2, 0) / array.length;
    return Math.sqrt(inner);
}
exports.stdev = stdev;
