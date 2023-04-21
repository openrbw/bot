import { Argument, ArgumentType, Command, CommandOptions, CommandSource } from '@matteopolak/framecord';
import { escapeMarkdown, Events, Interaction } from 'discord.js';

import { connectors } from '$/managers/game';
import { iter } from '$/util/iter';

export default class Verify extends Command {
	constructor(options: CommandOptions) {
		super(options);

		this.description = 'Verifies your account with a connector.';

		this.arguments.push(
			new Argument({
				name: 'connector',
				description: 'The connector to verify with.',
				type: ArgumentType.String,
				autocomplete: true,
			}),
			new Argument({
				name: 'code',
				description: 'The code to verify with.',
				type: ArgumentType.String,
				maxLength: 36,
				minLength: 1,
			})
		);
	}

	public async [Events.InteractionCreate](interaction: Interaction) {
		if (!interaction.isAutocomplete()) return;
		if (!this.is(interaction)) return;

		const name = interaction.options.getString('connector', true).toLowerCase();
		const filtered: { name: string, value: string }[] = [];

		for (const connector of connectors.keys()) {
			const lower = connector.toLowerCase();

			if (lower.includes(name)) {
				filtered.push({
					name: connector,
					value: lower,
				});

				if (filtered.length >= 25) break;
			}
		}

		if (filtered.length) return interaction.respond(filtered);

		const defaultConnectors = iter(connectors.keys())
			.map(c => ({ name: c, value: c }))
			.take(25)
			.toArray();

		return interaction.respond(defaultConnectors);
	}

	public async run(source: CommandSource, connectorName: string, code: string) {
		const connector = connectors.get(connectorName);
		if (!connector) return `The connector \`${escapeMarkdown(connectorName)}\` does not exist.`;

		const user = await connector.verify(source.user, code);

		return `Successfully verified your account with \`${escapeMarkdown(connectorName)}\` as \`${escapeMarkdown(user.username)}\`.`;
	}

	public async catch(error: Error) {
		throw error as unknown as string;
	}
}
