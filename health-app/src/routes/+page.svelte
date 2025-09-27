<script lang="ts">
	import { startHealthSummaryAgent } from '$lib/agent.remote';
	import { Play } from '@lucide/svelte';
	import { marked } from 'marked';

	let userId = $state('');
	let isLoading = $state(false);
	let isConsumingStream = $state(false);
	let textStreamRawContent = $state<null | string>(null);
	// TODO: add in the full stream and the resuming logic

	const textStreamContent = $derived.by(() => {
		if (!textStreamRawContent) return null;
		// 			return marked(
		// 				`# Health App

		// A simple little sveltekit app that consume's the agentuity agent.

		// ## Development

		// First setup the env vars. Make a new file called .env.local and copy the contents of .env.example
		// 				.example into it.

		// Update the .env.local file with your agent's id.
		// `,
		// 				{
		// 					async: false
		// 				}
		// 			);
		const real = textStreamRawContent.replace(/\\n/g, '\n');
		const markedResult = marked(real, {
			async: false
		});
		return markedResult;
	});

	async function getHealthSummary() {
		if (!userId.trim()) return;
		isLoading = true;

		const result = await startHealthSummaryAgent({ userId });

		isLoading = false;

		// Start consuming the stream
		await consumeStream(result.textStreamUrl);
	}

	async function consumeStream(url: string) {
		isConsumingStream = true;
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
					textStreamRawContent += chunk;
				}
			}
		} catch (error) {
			console.error('Error consuming stream:', error);
		} finally {
			isConsumingStream = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			getHealthSummary();
		}
	}
</script>

<main class="flex min-h-screen items-start justify-center bg-neutral-950 p-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold text-neutral-100">Health Agent</h1>
			<p class="text-sm text-neutral-400">Get personalized health summaries</p>
		</div>

		<div class="flex gap-2">
			<input
				id="userId"
				type="text"
				bind:value={userId}
				onkeydown={handleKeydown}
				placeholder="Enter your user ID"
				class="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 placeholder-neutral-500 transition-colors focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
			/>

			<button
				onclick={getHealthSummary}
				disabled={!userId.trim() || isLoading}
				class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:opacity-50"
			>
				{#if isLoading}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else}
					<Play class="h-5 w-5" />
				{/if}
			</button>
		</div>

		{#if isConsumingStream}
			<div class="flex items-center justify-center gap-2 py-4">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></div>
				<span class="text-sm font-medium text-neutral-300">Processing health summary...</span>
			</div>
		{/if}

		{#if textStreamContent}
			<div class="mx-auto max-w-[1200px] px-4 py-8">
				<div
					class="prose prose-sm w-full leading-tight whitespace-pre-wrap text-neutral-100 prose-invert prose-headings:my-2 prose-p:my-1"
				>
					{@html textStreamContent}
				</div>
			</div>
		{/if}
	</div>
</main>
