import {
	ActionRowData,
	ButtonComponentData,
	ButtonStyle,
	ComponentType,
} from 'discord.js';

export const COMPONENTS_PER_ROW = 5;

export function createTeamButtons(gameId: number, teams: number) {
	const rows: ActionRowData<ButtonComponentData>[] = [];
	const rowCount = Math.ceil(teams / COMPONENTS_PER_ROW);

	for (let i = 0, j = 0; i < rowCount; ++i) {
		rows[i] = {
			type: ComponentType.ActionRow,
			components: [],
		};

		if (i === 0) {
			rows[i].components.push({
				label: 'Tie',
				customId: `tie.${gameId}`,
				style: ButtonStyle.Primary,
				type: ComponentType.Button,
			});
		}

		for (; rows[i].components.length < 5 && teams-- > 0; ++j) {
			rows[i].components.push({
				label: `Team ${j + 1}`,
				customId: `team.${gameId}.${j}`,
				style: ButtonStyle.Secondary,
				type: ComponentType.Button,
			});
		}
	}

	return rows;
}
