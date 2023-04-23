import { prisma } from '$/database';

import { iter } from './iter';

export async function computeRoleChanges(guildId: string, modeId: number, oldRating: number, newRating: number) {
	const roles = await prisma.role.findMany({
		where: {
			guildId,
			modeId,
			OR: [
				{
					ratingMin: {
						gt: oldRating,
						lte: newRating,
					},
					ratingMax: {
						gte: newRating,
					},
				},
				{
					ratingMin: {
						lte: oldRating,
						gt: newRating,
					},
				},
				{
					ratingMax: {
						lt: oldRating,
						gte: newRating,
						not: null,
					},
					ratingMin: {
						lte: newRating,
					},
				},
				{
					ratingMax: {
						gte: oldRating,
						lt: newRating,
						not: null,
					},
				},
			],
		},
		select: {
			roleId: true,
			ratingMax: true,
			ratingMin: true,
		},
	});

	const [remove, add] = iter(roles).partition(r => (r.ratingMax !== null && r.ratingMax < newRating) || r.ratingMin > newRating);

	return { remove, add };
}
