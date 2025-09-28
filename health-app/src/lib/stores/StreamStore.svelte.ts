import z from 'zod';
import { useSearchParams } from 'runed/kit';
import { marked } from 'marked';
import { startHealthSummaryAgent } from '$lib/agent.remote';
import { watch } from 'runed';
import { Result } from 'neverthrow';
import { onMount } from 'svelte';

const streamChunkSchema = z.object({
	type: z.enum([
		'text-start',
		'text-delta',
		'text-end',
		'tool-input-start',
		'tool-input-delta',
		'tool-input-end',
		'tool-call',
		'tool-result',
		'start',
		'finish',
		'start-step',
		'finish-step',
		'reasoning-start',
		'reasoning-end',
		'reasoning-delta'
	]),
	id: z.string().optional(),
	delta: z.string().optional(),
	toolName: z.string().optional(),
	input: z.union([z.string(), z.record(z.any(), z.any())]).optional(),
	output: z.union([z.string(), z.record(z.any(), z.any())]).optional(),
	toolCallId: z.string().optional(),
	inputTextDelta: z.string().optional(),
	text: z.string().optional()
});

type StreamChunk = z.infer<typeof streamChunkSchema>;

type TextStreamEntry = {
	id: string;
	content: string;
	completed: boolean;
};

type ReasoningStreamEntry = {
	id: string;
	content: string;
	completed: boolean;
};

type ToolCallStreamEntry = {
	id: string;
	name: string;
	inputObject?: Record<any, any>;
	input: string;
	outputObject?: Record<any, any>;
	output: string;
	status: 'building' | 'executing' | 'completed';
};

type StreamEntry =
	| {
			kind: 'text';
			data: TextStreamEntry;
	  }
	| {
			kind: 'tool';
			data: ToolCallStreamEntry;
	  }
	| {
			kind: 'break';
			data: null;
	  }
	| {
			kind: 'reasoning';
			data: ReasoningStreamEntry;
	  };

const streamPageSearchSchema = z.object({
	textStreamUrl: z.string().default(''),
	fullStreamUrl: z.string().default('')
});

export class StreamStore {
	private searchParams = useSearchParams(streamPageSearchSchema);
	private textStreamUrl = $derived(this.searchParams.textStreamUrl);
	private fullStreamUrl = $derived(this.searchParams.fullStreamUrl);
	isStartingAgent = $state(false);
	isConsumingFullStream = $state(false);
	isConsumingTextStream = $state(false);
	userId = $state('');
	allStreamEntries = $state<StreamEntry[]>([]);
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
		this.allStreamEntries = [];
		this.searchParams.reset();
	}

	async getHealthSummary() {
		if (!this.userId.trim()) return;
		this.resetStreamState();
		this.isStartingAgent = true;

		const result = await startHealthSummaryAgent({ userId: this.userId });

		this.searchParams.update({
			textStreamUrl: result.textStreamUrl,
			fullStreamUrl: result.fullStreamUrl
		});

		this.isStartingAgent = false;

		this.isConsumingFullStream = true;
		this.isConsumingTextStream = true;

		await Promise.all([
			this.consumeTextStream(result.textStreamUrl),
			this.consumeFullStream(result.fullStreamUrl)
		]);
	}

	private async consumeTextStream(url: string) {
		this.isConsumingTextStream = true;
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
					this.textStreamRawContent += chunk;
				}
			}
		} catch (error) {
			console.error('Error consuming stream:', error);
		} finally {
			this.isConsumingTextStream = false;
		}
	}

	private handleChunkData = (data: StreamChunk) => {
		switch (data.type) {
			case 'text-start':
				if (data.id) {
					this.allStreamEntries.push({
						kind: 'text',
						data: {
							id: data.id,
							content: '',
							completed: false
						}
					});
				}
				break;
			case 'text-delta':
				if (data.id && data.text) {
					const stream = this.allStreamEntries.find(
						(s) => s.kind === 'text' && s.data.id === data.id
					);
					if (stream && stream.kind === 'text') {
						stream.data.content += data.text;
					}
				}
				break;
			case 'text-end':
				if (data.id) {
					const stream = this.allStreamEntries.find(
						(s) => s.kind === 'text' && s.data.id === data.id
					);
					if (stream && stream.kind === 'text') stream.data.completed = true;
				}
				break;
			case 'reasoning-start':
				if (data.id) {
					this.allStreamEntries.push({
						kind: 'reasoning',
						data: {
							id: data.id,
							content: '',
							completed: false
						}
					});
				}
				break;
			case 'reasoning-delta':
				if (data.id && data.text) {
					const reasoning = this.allStreamEntries.find(
						(s) => s.kind === 'reasoning' && s.data.id === data.id
					);
					if (reasoning && reasoning.kind === 'reasoning') {
						reasoning.data.content += data.text;
					}
				}
				break;
			case 'reasoning-end':
				if (data.id) {
					const reasoning = this.allStreamEntries.find(
						(s) => s.kind === 'reasoning' && s.data.id === data.id
					);
					if (reasoning && reasoning.kind === 'reasoning') {
						reasoning.data.completed = true;
					}
				}
				break;
			case 'tool-input-start':
				if (data.id && data.toolName) {
					this.allStreamEntries.push({
						kind: 'tool',
						data: {
							id: data.id,
							name: data.toolName,
							status: 'building',
							input: '',
							output: ''
						}
					});
				}
				break;
			case 'tool-input-delta':
				if (data.id && data.delta) {
					const toolCall = this.allStreamEntries.find(
						(s) => s.kind === 'tool' && s.data.id === data.id
					);
					if (toolCall && toolCall.kind === 'tool') {
						const currentInput = toolCall.data.input || '';
						toolCall.data.input = currentInput + data.delta;
					}
				}
				break;
			case 'tool-input-end':
				if (data.id) {
					const toolCall = this.allStreamEntries.find(
						(s) => s.kind === 'tool' && s.data.id === data.id
					);
					if (toolCall && toolCall.kind === 'tool') {
						toolCall.data.status = 'executing';
					}
				}
				break;
			case 'tool-call':
				if (data.toolCallId) {
					const toolCall = this.allStreamEntries.find(
						(s) => s.kind === 'tool' && s.data.id === data.toolCallId
					);
					if (toolCall && toolCall.kind === 'tool') {
						toolCall.data.status = 'executing';
						if (data.input) {
							const input = data.input;
							if (typeof input === 'string') {
								toolCall.data.input = input;
							} else {
								toolCall.data.inputObject = input;
							}
						}
					}
				}
				break;
			case 'tool-result':
				if (data.toolCallId) {
					const toolCall = this.allStreamEntries.find(
						(s) => s.kind === 'tool' && s.data.id === data.toolCallId
					);
					if (toolCall && toolCall.kind === 'tool') {
						toolCall.data.status = 'completed';
						if (data.output) {
							const output = data.output;
							if (typeof output === 'string') {
								toolCall.data.output = output;
							} else {
								toolCall.data.outputObject = output;
							}
						}
					}
				}
				break;
			case 'finish-step':
				this.allStreamEntries.push({ kind: 'break', data: null });
				break;
			default:
				break;
		}
	};

	private processStreamMessage = (message: string) => {
		if (message.trim().startsWith('data: ')) {
			const jsonStr = message.replace('data: ', '').trim();

			const safeParseJson = (rawJsonStr: string) =>
				Result.fromThrowable(
					() => JSON.parse(rawJsonStr),
					(error) => new Error(`Failed to parse chunk into JSON: ${error}. Chunk: ${jsonStr}`)
				)();

			const safeParseSchema = (uncheckedJson: any) =>
				Result.fromThrowable(
					() => streamChunkSchema.parse(uncheckedJson),
					(error) => new Error(`JSON chunk was malformed: ${error}. Chunk: ${jsonStr}`)
				)();

			const jsonResult = safeParseJson(jsonStr).andThen(safeParseSchema);

			if (jsonResult.isOk()) {
				this.handleChunkData(jsonResult.value);
			} else {
				console.warn('stream line failed:', jsonResult.error);
				console.log('jsonStr', jsonStr);
			}
		}
	};

	private async consumeFullStream(url: string) {
		this.isConsumingFullStream = true;
		try {
			const response = await fetch(url);
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) return;

			let buffer = '';
			let done = false;

			while (!done) {
				const { value, done: streamDone } = await reader.read();
				done = streamDone;
				if (!value) continue;

				buffer += decoder.decode(value, { stream: !done });

				const messages = buffer.split('\n\n');
				buffer = messages.pop() || '';

				for (const message of messages) {
					this.processStreamMessage(message);
				}
			}

			this.allStreamEntries.pop();
		} catch (error) {
			console.error('Error consuming stream:', error);
		} finally {
			this.isConsumingFullStream = false;
		}
	}

	constructor() {
		onMount(() => {
			if (this.textStreamUrl) {
				this.consumeTextStream(this.textStreamUrl);
			}
			if (this.fullStreamUrl) {
				this.consumeFullStream(this.fullStreamUrl);
			}
		});
	}
}
