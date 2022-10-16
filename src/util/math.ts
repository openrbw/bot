export function stdev(array: number[]): number {
	const sum = array.reduce((a, b) => a + b, 0);
	const inner = array.reduce((a, b) => a + (sum - b) ** 2, 0) / array.length;

	return Math.sqrt(inner);
}
