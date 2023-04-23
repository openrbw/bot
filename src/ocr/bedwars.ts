import { execFile } from 'node:child_process';

import axios from 'axios';
import sharp from 'sharp';
import similarity from 'string-similarity';

import { ScoreResult, ScoreResultCreate, ScoreResultUpdate } from '$/connectors/base';
import { GameScoreMinecraftInput } from '$/connectors/minecraft';

const MVP_REGEX =
	/^(?:\w*\s?.?[il]{2,3}er|.*iller).*?\s*(.{3,}?)\s*[-—–]+\s*(\d*)|^\w*\s?.?[il]{2,3}er.*?\s*(.{3,}?)\s*[-—–]*\s*(\d*)$/gim;
const WINNER_REGEX =
	/\s*(^(?:(?!FINAL KILL|B?[ea]d [VWl][ae]r[se]).)*\r?\n){1,5}?(?=.+[il]{2,3}er)/im;

const TESSERACT_ARGS = [
	'stdin',
	'stdout',
	'--oem',
	'1',
	'--psm',
	'6',
	'-l',
	'eng',
];

const RANK_NAMES = [
	'[VIP]',
	'[VIP+]',
	'[MVP]',
	'[MVP+]',
	'[MVP++]',
	'[ADMIN]',
	'[OWNER]',
	'[YOUTUBE]',
];

const RANK_NAMES_SET = new Set(RANK_NAMES);

type RGB = [number, number, number];
type MinimalGame = {
	proof: string;
	players: string[];
}

const COLOUR_FILTER_RAW = [
	[170, 0, 0],
	[255, 255, 85],
	[0, 170, 0],
	[85, 255, 85],
	[85, 255, 255],
	[0, 170, 170],
	[0, 0, 170],
	[85, 85, 255],
	[255, 85, 255],
	[170, 0, 170],
	[170, 170, 170],
	[255, 85, 85],
	[255, 170, 0],
].map(f => [
	[f[0] * 1.5, f[1] * 1.5, f[2] * 1.5],
	[f[0] * 0.5, f[1] * 0.5, f[2] * 0.5],
]) as unknown as [RGB, RGB][];

const COLOUR_FILTER_LENIENT = COLOUR_FILTER_RAW.map(([f]) => [
	[f[0] * 1.5, f[1] * 1.5, f[2] * 1.5],
	[f[0] * 0.5, f[1] * 0.5, f[2] * 0.5],
]) as unknown as [RGB, RGB][];

const COLOUR_FILTER_STRICT = COLOUR_FILTER_RAW.map(([f]) => [
	f,
	[f[0] * 0.8, f[1] * 0.8, f[2] * 0.8],
]) as unknown as [RGB, RGB][];

const MAX_PASSES = 3;
const COLOURS_REGEX = /^(?:Red|Blue|Green|Yellow)/;

function formatWinnerArray(text: string) {
	const lines = text.split(/\r?\n/);
	const output: string[] = [];

	for (let i = lines.length - 1; i >= 0; --i) {
		const line = lines[i];

		output.push(line);

		if (COLOURS_REGEX.test(line)) break;
	}

	return output.join(' ').split(/[,.\s]/);
}

async function preprocess(raw: Buffer, pass = 0) {
	if (pass === 0) {
		return sharp(
			await sharp(raw).removeAlpha().linear(3, -110).negate().toBuffer()
		)
			.threshold(240)
			.sharpen()
			.toBuffer();
	} else if (pass === 1) {
		const rgb = await sharp(raw)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		for (const [[r, g, b], i] of bufferToRgba(rgb.data)) {
			rgb.data[i] =
				rgb.data[i + 1] =
				rgb.data[i + 2] =
				COLOUR_FILTER_STRICT.some(
					([max, min]) =>
						r <= max[0] &&
						r >= min[0] &&
						g <= max[1] &&
						g >= min[1] &&
						b <= max[2] &&
						b >= min[2]
				)
					? 255
					: 0;
		}

		return sharp(rgb.data, {
			raw: rgb.info,
		})
			.png()
			.toBuffer();
	} else if (pass === 2) {
		const rgb = await sharp(raw)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		for (const [[r, g, b], i] of bufferToRgba(rgb.data)) {
			rgb.data[i] =
				rgb.data[i + 1] =
				rgb.data[i + 2] =
				COLOUR_FILTER_RAW.some(
					([rgb]) => r === rgb[0] && g <= rgb[1] && b === rgb[2]
				)
					? 255
					: 0;
		}

		return sharp(rgb.data, {
			raw: rgb.info,
		})
			.png()
			.toBuffer();
	} else if (pass === 3) {
		const rgb = await sharp(raw)
			.removeAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		for (const [[r, g, b], i] of bufferToRgba(rgb.data)) {
			rgb.data[i] =
				rgb.data[i + 1] =
				rgb.data[i + 2] =
				COLOUR_FILTER_LENIENT.some(
					([max, min]) =>
						r <= max[0] &&
						r >= min[0] &&
						g <= max[1] &&
						g >= min[1] &&
						b <= max[2] &&
						b >= min[2]
				)
					? 255
					: 0;
		}

		return sharp(rgb.data, {
			raw: rgb.info,
		})
			.png()
			.toBuffer();
	}

	return null;
}

function* bufferToRgba(buf: Buffer, skip = 0) {
	for (let i = skip; i < buf.length; i += 3) {
		yield [[buf[i], buf[i + 1], buf[i + 2]], i] as [RGB, number];
	}
}

function findPlayer(game: MinimalGame, text?: string): string | null {
	if (!text || text.length < 3) return null;

	const match = similarity.findBestMatch(
		text,
		RANK_NAMES.concat(game.players)
	).bestMatch;

	return match.rating < 0.15 || RANK_NAMES_SET.has(match.target)
		? null
		: match.target;
}

function findPlayers(game: MinimalGame, text?: string[]): Set<string> {
	if (!text) return new Set();

	const matches = new Set<string>();

	for (const name of text) {
		const match = findPlayer(game, name);

		if (match) {
			matches.add(match);
		}
	}

	return matches;
}

async function recognize(
	raw: Buffer,
	verbose = false,
	pass = 0
): Promise<{ text: string; image?: Buffer } | null> {
	const modified = await preprocess(raw, pass);

	if (modified === null) return null;

	return new Promise((resolve, reject) => {
		const child = execFile(
			'tesseract',
			TESSERACT_ARGS,
			async (err, stdout, _stderr) => {
				if (err === null)
					resolve({ text: stdout, image: verbose ? modified : undefined });
				else reject(new Error('unable to parse file'));
			}
		);

		child.stdin!.write(modified);
		child.stdin!.end();
	});
}

async function getImageFromUrl(game: MinimalGame): Promise<Buffer> {
	const { data } = await axios.get(game.proof, {
		responseType: 'arraybuffer',
	});

	return data;
}

export function gameToMinimal(
	game: GameScoreMinecraftInput
): MinimalGame | null {
	if (game.proof === null) return null;

	return {
		proof: game.proof,
		players: game.users.map(u => u.user.minecraft.username),
	};
}

export async function parse(
	game: GameScoreMinecraftInput,
	verbose = false,
	pass = 0
): Promise<ScoreResult | string> {
	try {
		const result = await _parse(game, verbose, pass);

		return result;
	} catch {
		return 'An error occurred.';
	}
}

async function _parse(
	game: GameScoreMinecraftInput,
	verbose = false,
	pass = 0
): Promise<ScoreResult | string> {
	// If no proof has been provided, abort
	if (game.proof === null) return 'No proof provided.';

	// Safe to assume `raw` won't be null, as `game.proof` is not null
	const rawGameData = gameToMinimal(game)!;
	const raw = await getImageFromUrl(rawGameData);

	const recognized = await recognize(raw, verbose, pass);

	if (recognized === null) return 'Out of possible image passes.';

	const rawMvpMap: Record<number, Set<number>> = {
		[-1]: new Set(),
	};
	const usernameToUser = new Map(game.users.map(u => [u.user.minecraft.username, u]));

	let mvpCount = 0,
		highestKills = -1;

	for (const match of recognized.text.matchAll(MVP_REGEX)) {
		const rawUsername = match[1] ?? match[3];
		const kills = parseInt(match[2] ?? match[4] ?? '-1');
		const username: string | undefined = findPlayers(
			rawGameData,
			rawUsername.split(/\s+/)
		)
			.values()
			.next().value;

		if (!username || kills === -1) continue;

		if (kills > highestKills) {
			if (highestKills > -1) {
				return 'Could not parse top killers correctly.';
			}

			highestKills = kills;
		}

		const id = usernameToUser.get(username)!.user.id;

		if (rawMvpMap[kills]) {
			rawMvpMap[kills].add(id);
		} else {
			rawMvpMap[kills] = new Set([id]);
		}

		++mvpCount;
	}

	if (mvpCount !== 3) return 'Could not find all three top killers.';

	const mvps = rawMvpMap[highestKills] ?? new Set();

	// Exit early if there's no MVP
	if (mvps.size === 0) {
		if (pass < MAX_PASSES) return _parse(game, verbose, pass + 1);
		else return 'No MVP found.';
	}

	const [full] = recognized.text.match(WINNER_REGEX) ?? [];
	const rawWinners = full ? formatWinnerArray(full) : undefined;

	const winners = findPlayers(rawGameData, rawWinners);

	// Create a counter for the number of winners from each team
	const counter = Array.from({ length: game.mode.teams }, (_, i) => ({
		i,
		v: 0,
	}));

	// Iterate through the detected winners, adding up the total winners per team
	for (const winner of winners) {
		const i = usernameToUser.get(winner);
		if (i === undefined) continue;

		counter[i.team].v++;
	}

	// Sort the teams in descending order
	counter.sort((a, b) => b.v - a.v);

	// If the top two teams have the same number of detected winners, abort
	if (counter[0].v === counter[1].v) {
		return `The two teams with the highest number of detected winners are equal:\nTeam ${counter[0].i + 1} at ${counter[0].v} winners\nTeam ${counter[1].i + 1} at ${counter[1].v} winners`;
	}

	if (counter[0].v <= Math.floor(game.mode.playersPerTeam / 2))
		return 'The top team does not have enough winners to pass the threshold.';

	return {
		game,
		winner: counter[0].i,
		create(user) {
			const create: Partial<ScoreResultCreate> = {};

			if (mvps.has(user.userId)) {
				create.mvps = 1;
			}

			return create;
		},
		update(user) {
			const update: Partial<ScoreResultUpdate> = {};

			if (mvps.has(user.userId)) {
				update.mvps = {
					increment: 1,
				};
			}

			return update;
		},
	};
}
