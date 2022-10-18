import { PickedPlayer } from '@prisma/client';
import { EmbedField } from 'discord.js';
import { inPlaceSort } from 'fast-sort';

import { iter } from './iter';

export function playersToFields(
	players: Omit<PickedPlayer, 'gameId'>[],
): EmbedField[] {
	inPlaceSort(players).asc([p => p.team, p => p.userId]);

	return iter(players)
		.groupBy(p => p.team)
		.map((t, i) => ({
			name: `Team #${i + 1}`,
			value: t.map(p => `<@${p}>`).join('\n'),
			inline: true,
		}))
		.toArray();
}
