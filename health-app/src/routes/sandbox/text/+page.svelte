<script lang="ts">
	import { startHealthSummaryAgent } from '$lib/agent.remote';
	import { createStreamConsumer, createTextStream } from '$lib/r-and-d/consumeStream';
	import { marked } from 'marked';
	import { ResultAsync } from 'neverthrow';
	import z from 'zod';
	import { useSearchParams } from 'runed/kit';
	import { onMount } from 'svelte';

	const streamPageSearchSchema = z.object({
		streamUrl: z.string().default('')
	});

	const searchParams = useSearchParams(streamPageSearchSchema);

	const streamUrl = $derived(searchParams.streamUrl);

	$inspect(streamUrl);

	let testTextStreamContent = $state('');
	const testTextStreamMarkdownContent = $derived(
		marked(testTextStreamContent, {
			async: false
		})
	);
	let isStreaming = $state(false);
	let streamStatus = $state('Ready');

	const testTextStream = createTextStream();
	const testTextStreamConsumer = createStreamConsumer(testTextStream, {
		onChunk: (chunk) => {
			testTextStreamContent += chunk;
		},
		onComplete: (data) => {
			console.log('Test text stream complete', data);
			streamStatus = `Completed: ${data.totalChunks} chunks, ${data.totalBytes} bytes in ${data.duration}ms`;
			isStreaming = false;
		},
		onError: (error) => {
			console.error('Test text stream error', error);
			streamStatus = `Error: ${error.message}`;
			isStreaming = false;
		},
		onStart: () => {
			testTextStreamContent = '';
			streamStatus = 'Streaming...';
			isStreaming = true;
		}
	});

	async function startStream() {
		const startAgentResult = await ResultAsync.fromPromise(
			startHealthSummaryAgent({ userId: 'testing text stream...' }),
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

		const { textStreamUrl } = startAgentResult.value;

		searchParams.update({ streamUrl: textStreamUrl });

		testTextStreamConsumer.start(textStreamUrl);
	}

	onMount(() => {
		if (streamUrl) {
			testTextStreamConsumer.start(streamUrl);
		}
	});

	function stopStream() {
		testTextStreamConsumer.stop();
		isStreaming = false;
		streamStatus = 'Stopped';
	}

	function clearStream() {
		searchParams.reset();
		testTextStreamContent = '';
		streamStatus = 'Ready';
		isStreaming = false;
	}
</script>

<main class="h-screen bg-neutral-950 p-4 md:p-8">
	<div class="mx-auto h-full max-w-7xl">
		<div class="mb-6 text-center">
			<h1 class="mb-2 text-2xl font-bold text-neutral-100 md:text-3xl">Stream Consumer Test</h1>
			<p class="text-sm text-neutral-400">Test the stream consumer functionality</p>
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
				</div>
				<div class="text-sm text-neutral-400">
					<strong class="text-neutral-200">Status:</strong>
					{streamStatus}
				</div>
			</div>

			<!-- Stream Content Column -->
			<div
				class="flex flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-lg"
			>
				<h2 class="mb-6 text-lg font-semibold text-neutral-200 md:text-xl">Stream Content</h2>
				<div class="flex-1 overflow-auto">
					<div class="space-y-4">
						<div
							class="prose max-w-none rounded-lg border border-neutral-700 bg-neutral-950 p-4 font-mono text-sm text-green-400 prose-invert"
						>
							{@html testTextStreamMarkdownContent || 'Stream content will appear here...'}
						</div>
						{#if testTextStreamContent}
							<div class="text-sm text-neutral-400">
								{testTextStreamContent.length} characters received
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</main>
