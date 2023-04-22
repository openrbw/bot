/** Calculates the standard deivation of an array of numbers */
export function stdev(array: number[]): number {
	const avg = array.reduce((a, b) => a + b, 0) / array.length;
	const inner = array.reduce((a, b) => a + (b - avg) ** 2, 0) / array.length;

	return Math.sqrt(inner);
}
