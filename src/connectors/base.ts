import { Client } from '@matteopolak/framecord';
import { Game } from '@prisma/client';
import { User } from 'discord.js';

export type ConnectorUser = {
	id: number;
	username: string;
};

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
	public abstract update(discordId: string): Promise<ConnectorUser>;

	public abstract onGameStart(game: Game): Promise<void>;
}
