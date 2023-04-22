import { GameUser, Profile, User } from '@prisma/client';

import { iter } from './iter';

export const BASE_RATING = 400;
export const SCALING_FACTOR = 173.7178;
const PI2 = Math.PI ** 2;
const TAU = 0.5;
const TAU_COMPUTED = 1 / TAU ** 2;

export function muToRating(mu: number): number {
	return Math.floor(SCALING_FACTOR * mu + BASE_RATING);
}

export const enum GameResult {
	WIN,
	TIE,
}

export type GlickoCalculation = {
	// The new rating deviation
	phi: number;
	// The new rating
	mu: number;
	// The new rating volatility
	rv: number;
}

export type GameUserWithProfile = GameUser & {
	user: User & {
		profiles: Profile[];
	};
};

/**
 *
 * @param o2 ø²
 * @returns g(ø)²
 */
function g2(o2: number): number {
	return 1 / (1 + 3 * o2 / PI2);
}

/**
 *
 * @param u μ
 * @param uj jth μ
 * @param o2j jth ø²
 * @returns E(μ, jth μ, jth ø²)
 */
function E(u: number, uj: number, o2j: number): number {
	return 1 / (1 + Math.exp(-Math.sqrt(g2(o2j)) * (u - uj)));
}

/**
 * Solves for x in f(x) = 0 using Regula falsi (Illinois algorithm)
 * @param f A function that returns a number
 */
function findRoot(f: (x: number) => number, a: number, b: number): number {
	let cs0 = 0;
	let cs1 = 1;

	for (; ;) {
		const fa = f(a);
		const fb = f(b);

		const c = cs0 === cs1 ? (0.5 * a * fb - b * fa) / (0.5 * fb - fa) : (a * fb - b * fa) / (fb - fa);
		const fc = f(c);

		cs1 = cs0;
		cs0 = Math.sign(fc);

		if (Math.abs(fc) < 1e-6) {
			return c;
		}

		if (Math.sign(fc) === Math.sign(fa)) {
			a = c;
		} else {
			b = c;
		}
	}
}

/**
 *
 * @param users Only one profile should be present per user
 * @param mode
 * @param winners A set of team indices for the winning (or tying) teams. Teams not present in this list are considered losing.
 */
export function computeEloChange(users: GameUserWithProfile[], result: GameResult.TIE, winner?: number): Map<number, GlickoCalculation>;
export function computeEloChange(users: GameUserWithProfile[], result: GameResult.WIN, winner: number): Map<number, GlickoCalculation>;
export function computeEloChange(users: GameUserWithProfile[], result: GameResult, winner?: number): Map<number, GlickoCalculation> {
	// Ensure that the users are sorted by team, starting with team 0
	users.sort((a, b) => a.team - b.team);

	// [μ, ø², g(ø)², g(ø)]
	const teamRating: [number, number, number, number][] = [];
	const teams = iter(users)
		.groupBy(u => u.team)
		.extract(teamRating, t => {
			let mu = 0;
			let phi = 0;

			for (const player of t) {
				const profile = player.user.profiles[0];

				phi += profile.phi;
				mu += profile.mu;
			}

			const phiAvg = (phi / t.length) ** 2;
			const g = g2(phiAvg);

			return [mu / t.length, phiAvg, g, Math.sqrt(g)] as const;
		})
		.toArray();

	const results = new Map<number, GlickoCalculation>();

	for (const [idx, team] of teams.entries()) {
		const opps = teamRating.filter((_, i) => i !== idx);
		const s = result === GameResult.TIE ? 0.5 : result === GameResult.WIN && winner == idx ? 1 : 0;

		for (const player of team) {
			const profile = player.user.profiles[0];

			let variance = 0;
			let delta = 0;

			for (const opp of opps) {
				const e = E(profile.mu, opp[0], opp[1]);

				variance += opp[2] * e * (1 - e);
				delta += opp[3] * (s - e);
			}

			variance = 1 / variance;

			const phi2 = profile.phi ** 2;
			const topFrac = (delta * variance) ** 2 - phi2 - variance;
			const bottomFrac = phi2 + variance;
			const rightFrac = Math.log(profile.rv ** 2) * TAU_COMPUTED;

			const f = (x: number) => {
				const e = Math.exp(x);

				return 0.5 * (e * (topFrac - e) / (bottomFrac + e) ** 2 + rightFrac - x * TAU_COMPUTED);
			};

			const A = findRoot(f, -1, 1);

			const oPrime = Math.exp(A / 2);
			const ø2Prime = 1 / (1 / phi2 + 1 / variance);
			const muPrime = ø2Prime * delta;

			results.set(player.userId, {
				mu: muPrime,
				phi: Math.sqrt(ø2Prime),
				rv: oPrime,
			});
		}
	}

	return results;
}
