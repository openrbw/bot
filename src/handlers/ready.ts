import { EventHandler, Handler } from '@matteopolak/framecord';

export default class ReadyHandler extends Handler {
	@EventHandler({ once: true })
	public async ready() {
		console.log(`Logged in as ${this.client.user!.tag}`);
	}
}
