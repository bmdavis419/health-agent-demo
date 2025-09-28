import z from 'zod';
import { useSearchParams } from 'runed/kit';
import { marked } from 'marked';
import { startHealthSummaryAgent } from '$lib/agent.remote';
import { watch } from 'runed';

const streamPageSearchSchema = z.object({
	textStreamUrl: z.string().default('')
});

export class StreamStore {
	private searchParams = useSearchParams(streamPageSearchSchema);
	private textStreamUrl = $derived(this.searchParams.textStreamUrl);
	isStartingAgent = $state(false);
	isConsumingStream = $state(false);
	userId = $state('');
	private textStreamRawContent = $state<string>('');

	textStreamContent = $derived.by(() => {
		if (!this.textStreamRawContent) return null;
		const real = this.textStreamRawContent.replace(/\\n/g, '\n');
		const markedResult = marked(real, {
			async: false
		});
		return markedResult;
	});

	resetStreamState() {
		this.textStreamRawContent = '';
		this.searchParams.textStreamUrl = '';
	}

	async getHealthSummary() {
		if (!this.userId.trim()) return;
		this.resetStreamState();
		this.isStartingAgent = true;

		const result = await startHealthSummaryAgent({ userId: this.userId });

		this.searchParams.textStreamUrl = result.textStreamUrl;
		this.isStartingAgent = false;
	}

	private async consumeStream(url: string) {
		console.log('consuming le stream');
		this.isConsumingStream = true;
		try {
			const response = await fetch(url);
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) return;

			let done = false;
			while (!done) {
				const { value, done: streamDone } = await reader.read();
				done = streamDone;

				if (value) {
					const chunk = decoder.decode(value, { stream: !done });
					console.log(chunk);
					this.textStreamRawContent += chunk;
				}
			}
		} catch (error) {
			console.error('Error consuming stream:', error);
		} finally {
			this.isConsumingStream = false;
		}
	}

	constructor() {
		watch(
			() => this.textStreamUrl,
			(url) => {
				if (url) {
					this.consumeStream(url);
				} else {
					this.resetStreamState();
				}
			}
		);
	}
}
