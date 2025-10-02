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
		textStreamUrl: z.string().default(''),
		fullStreamUrl: z.string().default('')
	});

	const searchParams = useSearchParams(streamPageSearchSchema);

	const internalTextStreamUrl = $derived(searchParams.textStreamUrl);
	const internalFullStreamUrl = $derived(searchParams.fullStreamUrl);

	const searchParamsString = $derived(searchParams.toURLSearchParams().toString());

	let isStreaming = $state(false);
	let streamStatus = $state('Ready');
	let allTheChunks = $state<BetterStreamChunk[]>([]);

	const stream = createSseStream({
		chunkSchema: betterStreamChunkSchema
	});

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

		const { fullStreamUrl, textStreamUrl } = startAgentResult.value;

		searchParams.update({ fullStreamUrl, textStreamUrl });

		streamConsumer.start(fullStreamUrl);
	}

	onMount(() => {
		if (internalFullStreamUrl) {
			streamConsumer.start(internalFullStreamUrl);
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

<main class="h-screen bg-neutral-950 p-4 md:p-8">
	<div class="mx-auto h-full max-w-7xl">
		<div class="mb-6 text-center">
			<h1 class="mb-2 text-2xl font-bold text-neutral-100 md:text-3xl">SSE Stream Test</h1>
			<p class="text-sm text-neutral-400">Test the SSE stream consumer functionality</p>
		</div>

		<div class="grid h-[calc(100%-6rem)] grid-cols-1 gap-6 md:grid-cols-2">
			<!-- Controls Column -->
			<div
				class="flex flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-lg"
			>
				<h2 class="mb-6 text-lg font-semibold text-neutral-200 md:text-xl">Controls</h2>
				<div class="mb-6 flex flex-wrap gap-3 md:gap-4">
					<button
						class="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-4"
						disabled={isStreaming}
						onclick={startStream}
					>
						Start Stream
					</button>
					<button
						class="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-4"
						disabled={!isStreaming}
						onclick={stopStream}
					>
						Stop Stream
					</button>
					<button
						class="flex-1 rounded-lg bg-neutral-600 px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-4"
						disabled={isStreaming}
						onclick={clearStream}
					>
						Clear Stream
					</button>
					{#if internalFullStreamUrl}
						<a
							class="flex-1 rounded-lg bg-neutral-600 px-3 py-2 text-sm text-white transition-colors duration-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none md:px-4"
							href={`/sandbox/text?${searchParamsString}`}
						>
							See Text Stream
						</a>
					{/if}
				</div>
				<div class="text-sm text-neutral-400">
					<strong class="text-neutral-200">Status:</strong>
					{streamStatus}
				</div>
			</div>

			<!-- Stream View Column -->
			<div class="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
				<FullStreamView fullStreamChunks={allTheChunks} />
			</div>
		</div>
	</div>
</main>
