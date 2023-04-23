import { iter } from '$/util/iter';

export const TIME_PARSE_REGEX = /(\d+)(ms|s|m|h|d|w|mo|y)\s*/g;
export const CHAR_TO_TIME_TABLE: Record<string, number> = {
	ms: 1,
	s: 1_000,
	m: 1_000 * 60,
	h: 1_000 * 60 * 60,
	d: 1_000 * 60 * 60 * 24,
	w: 1_000 * 60 * 60 * 24 * 7,
	mo: 1_000 * 60 * 60 * 24 * 30,
	y: 1_000 * 60 * 60 * 24 * 365,
};

/**
 *
 * @param time The formatted time string: "1ms 1s 1m 1h 1d 1w 1mo 1y"
 * @returns The parsed time in milliseconds
 */
export function parseTimeString(time: string) {
	const matches = time.matchAll(TIME_PARSE_REGEX);

	return iter(matches).reduce(
		(s, m) => s + parseInt(m[0]) * CHAR_TO_TIME_TABLE[m[1]],
		0
	);
}

export function timeToDiscordStamp(date: Date) {
	return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}
