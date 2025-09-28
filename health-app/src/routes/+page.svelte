<script lang="ts">
	import { Play, Trash } from '@lucide/svelte';
	import { StreamStore } from './StreamStore.svelte';

	const streamStore = new StreamStore();

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		streamStore.getHealthSummary();
	}
</script>

<main
	class="flex min-h-screen flex-col items-center justify-start space-y-8 bg-neutral-950 p-8 pb-16"
>
	<div class="text-center">
		<h1 class="mb-2 text-3xl font-bold text-neutral-100">Health Agent</h1>
		<p class="text-sm text-neutral-400">Get personalized health summaries</p>
	</div>

	<form class="mx-auto flex items-center gap-2" onsubmit={handleSubmit}>
		<input
			id="userId"
			type="text"
			bind:value={streamStore.userId}
			placeholder="Enter your user ID"
			class="w-[400px] flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 placeholder-neutral-500 transition-colors focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
		/>

		<button
			type="submit"
			disabled={!streamStore.userId.trim() ||
				streamStore.isStartingAgent ||
				streamStore.isConsumingStream}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white transition-colors duration-200 hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:opacity-50"
		>
			{#if streamStore.isStartingAgent}
				<div
					class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
				></div>
			{:else}
				<Play class="h-5 w-5" />
			{/if}
		</button>
		<button
			type="button"
			onclick={() => streamStore.resetStreamState()}
			disabled={streamStore.isStartingAgent || streamStore.isConsumingStream}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:opacity-50"
		>
			<Trash class="h-5 w-5" />
		</button>
	</form>

	{#if streamStore.textStreamContent}
		<div class="prose w-full grow px-8 leading-none text-neutral-100 prose-invert">
			{@html streamStore.textStreamContent}
		</div>
	{/if}
</main>
{#if streamStore.isConsumingStream}
	<div class="fixed right-4 bottom-4 z-50">
		<div class="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 shadow-lg">
			<div class="flex items-center gap-2">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></div>
				<span class="text-sm font-medium text-neutral-200">Processing health summary...</span>
			</div>
		</div>
	</div>
{/if}
