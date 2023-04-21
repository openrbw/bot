import { Client } from '@matteopolak/framecord';
import { Game, GameUser, Mode, Prisma } from '@prisma/client';
import { User } from 'discord.js';

import { GameWithModeNameAndPlayersWithProfiles } from '$/util/score';

export type ConnectorUser = {
	id: number
	username: string
};

export type GameScoreInput = Game & {
	mode: Mode
};

export type ScoreResultCreate = Pick<Partial<Prisma.XOR<Prisma.ProfileCreateInput, Prisma.ProfileUncheckedCreateInput>>, 'mvps'>
export type ScoreResultUpdate = Pick<Partial<Prisma.XOR<Prisma.ProfileUpdateInput, Prisma.ProfileUncheckedUpdateInput>>, 'mvps'>

export type ScoreResult = {
	create: (user: GameUser) => ScoreResultCreate
	update: (user: GameUser) => ScoreResultUpdate
	game: GameWithModeNameAndPlayersWithProfiles
	winner: number
}

export abstract class Connector {
	public abstract readonly name: string;
	public readonly client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public init(): Promise<void> {
		return Promise.resolve();
	}

	public abstract findOne(discordId: string): Promise<ConnectorUser | null>;
	public abstract findMany(discordIds: string[]): Promise<ConnectorUser[]>;

	public abstract verify(user: User, code: string): Promise<ConnectorUser>;
	public abstract unlink(user: User): Promise<ConnectorUser>;
	public abstract update(discordId: string): Promise<ConnectorUser>;

	public abstract onGameStart(game: Game): Promise<void>;

	public async score(_game: GameScoreInput): Promise<null | ScoreResult> {
		return null;
	}
}
