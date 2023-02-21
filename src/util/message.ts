import { GameUser } from '@prisma/client';
import { EmbedField } from 'discord.js';
import { inPlaceSort } from 'fast-sort';

import { iter } from './iter';

/**
 *
 * @param players The list of players
 * @returns `EmbedField`s where the name is "Title #{team}" and the value is the user tags of the players on the team
 */
export function playersToFields(
	players: Omit<GameUser, 'gameId'>[]
): EmbedField[] {
	inPlaceSort(players).asc([p => p.team, p => p.index]);

	return iter(players)
		.groupBy(p => p.team)
		.map((t, i) => ({
			name: `Team #${i + 1}`,
			value: t.map(p => `<@${p}>`).join('\n'),
			inline: true,
		}))
		.toArray();
}
