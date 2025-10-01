<script lang="ts">
	import FullStreamView from '$lib/components/FullStreamView.svelte';
	import { createSseStream, createStreamConsumer } from '$lib/r-and-d/consumeStream';
	import { betterStreamChunkSchema, type BetterStreamChunk } from '$lib/schemas';
	import { startHealthSummaryAgent } from '$lib/agent.remote';
	import { ResultAsync } from 'neverthrow';
	import z from 'zod';
	import { useSearchParams } from 'runed/kit';
	import { onMount } from 'svelte';

	const streamPageSearchSchema = z.object({
		streamUrl: z.string().default('')
	});

	const searchParams = useSearchParams(streamPageSearchSchema);

	const streamUrl = $derived(searchParams.streamUrl);

	let isStreaming = $state(false);
	let streamStatus = $state('Ready');

	const stream = createSseStream({
		chunkSchema: betterStreamChunkSchema
	});

	let allTheChunks = $state<BetterStreamChunk[]>([]);

	const streamConsumer = createStreamConsumer(stream, {
		onChunk: (chunk) => {
			allTheChunks.push(chunk);
		},
		onComplete: (data) => {
			console.log('FULL STREAM COMPLETE', data);
			streamStatus = `Completed: ${data.totalChunks} chunks, ${data.totalBytes} bytes in ${data.duration}ms`;
			isStreaming = false;
		},
		onError: (error) => {
			console.error('FULL STREAM ERROR', error);
			streamStatus = `Error: ${error.message}`;
			isStreaming = false;
		},
		onStart: () => {
			console.log('FULL STREAM START');
			allTheChunks = [];
			streamStatus = 'Streaming...';
			isStreaming = true;
		}
	});

	async function startStream() {
		const startAgentResult = await ResultAsync.fromPromise(
			startHealthSummaryAgent({ userId: 'testing full stream...' }),
			(error) => {
				return new Error('Failed to start health summary agent', {
					cause: error
				});
			}
		);

		if (startAgentResult.isErr()) {
			console.error(startAgentResult.error);
			streamStatus = `Error: ${startAgentResult.error.message}`;
			isStreaming = false;
			return;
		}

		const { fullStreamUrl } = startAgentResult.value;

		searchParams.update({ streamUrl: fullStreamUrl });

		streamConsumer.start(fullStreamUrl);
	}

	onMount(() => {
		if (streamUrl) {
			streamConsumer.start(streamUrl);
		}
	});

	function stopStream() {
		streamConsumer.stop();
		isStreaming = false;
		streamStatus = 'Stopped';
	}

	function clearStream() {
		searchParams.reset();
		allTheChunks = [];
		streamStatus = 'Ready';
		isStreaming = false;
	}
</script>

<main class="flex h-screen flex-col items-center bg-neutral-950 p-8">
	<div class="w-1/2 flex-1">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold text-neutral-100">SSE Stream Test</h1>
			<p class="text-sm text-neutral-400">Test the SSE stream consumer functionality</p>
		</div>

		<div class="mt-8 rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-semibold text-neutral-200">Controls</h2>
			<div class="mb-4 flex gap-4">
				<button
					class="rounded-lg bg-primary px-4 py-2 text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isStreaming}
					onclick={startStream}
				>
					Start Stream
				</button>
				<button
					class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!isStreaming}
					onclick={stopStream}
				>
					Stop Stream
				</button>
				<button
					class="rounded-lg bg-neutral-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isStreaming}
					onclick={clearStream}
				>
					Clear Stream
				</button>
			</div>
			<div class="text-sm text-neutral-400">
				<strong class="text-neutral-200">Status:</strong>
				{streamStatus}
			</div>
		</div>

		<FullStreamView fullStreamChunks={allTheChunks} />
	</div>
</main>
