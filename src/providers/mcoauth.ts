import axios from 'axios';

export type AuthResponseSuccess<T> = T & {
	success: true;
};

export type AuthResponseFailure = {
	success: false;
	error: string;
};

export type AuthResponse<T, S extends boolean = boolean> = S extends false
	? AuthResponseFailure
	: S extends true
	? AuthResponseSuccess<T>
	: AuthResponseFailure | AuthResponseSuccess<T>;

export interface AuthCodeResponse {
	ign: string;
	uuid: string;
}

/** Fetches authentication data from a code */
export async function getPlayerData(code: number) {
	const response = await axios.get<AuthResponse<AuthCodeResponse>>(
		`https://api.mc-oauth.com/v1/code/${code}`,
		{
			validateStatus: () => true,
		},
	);

	return response.data;
}
