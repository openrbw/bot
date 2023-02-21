"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playersToFields = void 0;
const fast_sort_1 = require("fast-sort");
const iter_1 = require("./iter");
function playersToFields(players) {
    (0, fast_sort_1.inPlaceSort)(players).asc([p => p.team, p => p.index]);
    return (0, iter_1.iter)(players)
        .groupBy(p => p.team)
        .map((t, i) => ({
        name: `Team #${i + 1}`,
        value: t.map(p => `<@${p}>`).join('\n'),
        inline: true,
    }))
        .toArray();
}
exports.playersToFields = playersToFields;
