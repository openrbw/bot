import { GameUser } from '@prisma/client';
import { EmbedField } from 'discord.js';
import { inPlaceSort } from 'fast-sort';

import { iter } from '$/util/iter';

import { GlickoCalculation } from './elo';

const formatter = new Intl.NumberFormat('en-US', {
	style: 'decimal',
	maximumFractionDigits: 0,
	signDisplay: 'always',
});

/**
 *
 * @param players The list of players
 * @returns `EmbedField`s where the name is "Title #{team}" and the value is the user tags of the players on the team
 */
export function playersToFields(
	players: Omit<GameUser, 'gameId'>[],
	winnerIdx?: number,
	score?: Map<number, GlickoCalculation>
): EmbedField[] {
	inPlaceSort(players).asc([p => p.team, p => p.index]);

	if (score) {
		return iter(players)
			.groupBy(p => p.team)
			.map((t, i) => ({
				name: `Team #${i + 1}${i === winnerIdx ? ' 🏆' : ''}`,
				value: t.map(p => `<@${p}>${score.has(p.userId) ? ` [${formatter.format(score.get(p.userId)!.mu)}]` : ''}`).join('\n'),
				inline: true,
			}))
			.toArray();
	}

	return iter(players)
		.groupBy(p => p.team)
		.map((t, i) => ({
			name: `Team #${i + 1}${i === winnerIdx ? ' 🏆' : ''}`,
			value: t.map(p => `<@${p}>`).join('\n'),
			inline: true,
		}))
		.toArray();
}
