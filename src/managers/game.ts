import { PartyWithMemberProfiles, QueueList } from '@handlers/queue';
import { Client } from '@matteopolak/framecord';

export default class GameManager {
	protected client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	public async createGame(
		queue: QueueList,
		parties: PartyWithMemberProfiles[],
	) {
		// create game channels
		// create team picking, or create teams automatically if disabled
		// put teams into their vcs
		// create map banning for team captains
		// create scoring command, add option to use built-in OCR configured for Hypixel Bedwars
	}
}
