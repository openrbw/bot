import { prisma } from '$/database';

import { iter } from './iter';

export async function computeRoleChanges(guildId: string, oldRating: number, newRating: number) {
	const roles = await prisma.role.findMany({
		where: {
			guildId,
			OR: [
				{
					ratingMax: {
						lt: newRating,
						gte: oldRating,
					},
				},
				{
					ratingMin: {
						gt: newRating,
						lte: oldRating,
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

	const [remove, add] = iter(roles).partition(r => r.ratingMax < newRating || r.ratingMin > newRating);

	return { remove, add };
}
