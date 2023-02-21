"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTeamButtons = exports.COMPONENTS_PER_ROW = void 0;
const discord_js_1 = require("discord.js");
exports.COMPONENTS_PER_ROW = 5;
function createTeamButtons(gameId, teams) {
    const rows = [];
    const rowCount = Math.ceil(teams / exports.COMPONENTS_PER_ROW);
    for (let i = 0, j = 0; i < rowCount; ++i) {
        rows[i] = {
            type: discord_js_1.ComponentType.ActionRow,
            components: [],
        };
        for (; teams % 5 !== 0; ++j) {
            rows[i].components.push({
                label: `Team ${j + 1}`,
                customId: `team.${gameId}.${j}`,
                style: discord_js_1.ButtonStyle.Secondary,
                type: discord_js_1.ComponentType.Button,
            });
        }
    }
    return rows;
}
exports.createTeamButtons = createTeamButtons;
