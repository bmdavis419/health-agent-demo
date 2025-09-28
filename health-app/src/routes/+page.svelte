<script lang="ts">
	import { Play, Trash } from '@lucide/svelte';
	import { marked } from 'marked';
	import { StreamStore } from '../lib/stores/StreamStore.svelte';
	import { getShikiStore } from '$lib/stores/ShikiStore.svelte';

	const streamStore = new StreamStore();
	const shikiStore = getShikiStore();

	let isConsumingOrStarting = $derived(
		streamStore.isConsumingFullStream ||
			streamStore.isConsumingTextStream ||
			streamStore.isStartingAgent
	);

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		streamStore.getHealthSummary();
	}
</script>

<main class="flex h-screen flex-col bg-neutral-950">
	<div class="flex-shrink-0 p-8">
		<div class="text-center">
			<h1 class="mb-2 text-3xl font-bold text-neutral-100">Health Agent</h1>
			<p class="text-sm text-neutral-400">Get personalized health summaries</p>
		</div>

		<form class="mx-auto mt-8 flex max-w-lg items-center gap-2" onsubmit={handleSubmit}>
			<input
				id="userId"
				type="text"
				bind:value={streamStore.userId}
				placeholder="Enter your user ID"
				class="w-[400px] flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-neutral-100 placeholder-neutral-500 transition-colors focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
			/>

			<button
				type="submit"
				disabled={!streamStore.userId.trim() || isConsumingOrStarting}
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
				disabled={isConsumingOrStarting}
				class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-white transition-colors duration-200 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:opacity-50"
			>
				<Trash class="h-5 w-5" />
			</button>
		</form>
	</div>

	{#if streamStore.textStreamContent || streamStore.allStreamEntries.length > 0}
		<div class="flex-1 overflow-hidden p-8 pt-0">
			<div class="flex h-full max-w-7xl gap-6">
				<!-- Text Stream Column -->
				<div class="flex w-1/2 flex-col">
					<h2 class="mb-3 flex-shrink-0 text-lg font-semibold text-neutral-200">Health Summary</h2>
					<div
						class="flex-1 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-lg"
					>
						{#if streamStore.textStreamContent}
							<div class="prose max-w-none text-neutral-100 prose-invert">
								{@html streamStore.textStreamContent}
							</div>
						{:else}
							<div class="flex h-full items-center justify-center text-neutral-500">
								<p>Text stream will appear here...</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Full Stream Column -->
				<div class="flex w-1/2 flex-col">
					<h2 class="mb-3 flex-shrink-0 text-lg font-semibold text-neutral-200">Full Stream</h2>
					<div
						class="flex-1 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6 shadow-lg"
					>
						{#if streamStore.allStreamEntries.length > 0}
							<div class="space-y-4">
								{#each streamStore.allStreamEntries as entry}
									<div class="w-full rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
										{#if entry.kind === 'text'}
											<div class="space-y-2">
												<div class="flex items-center gap-2">
													<span
														class="rounded bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300"
														>Text</span
													>
													{#if entry.data.completed}
														<span class="text-xs text-green-400">✓ Completed</span>
													{:else}
														<span class="text-xs text-yellow-400">⟳ Streaming...</span>
													{/if}
												</div>
												<div class="prose max-w-none text-sm text-neutral-200 prose-invert">
													{@html marked(entry.data.content)}
												</div>
											</div>
										{:else if entry.kind === 'reasoning'}
											<div class="space-y-2">
												<div class="flex items-center gap-2">
													<span
														class="rounded bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-300"
														>Reasoning</span
													>
													{#if entry.data.completed}
														<span class="text-xs text-green-400">✓ Completed</span>
													{:else}
														<span class="text-xs text-yellow-400">⟳ Thinking...</span>
													{/if}
												</div>
												<div class="text-sm text-neutral-300 italic">
													{entry.data.content}
												</div>
											</div>
										{:else if entry.kind === 'tool'}
											<div class="space-y-3">
												<div class="flex items-center justify-between">
													<div class="flex items-center gap-2">
														<span
															class="rounded bg-green-500/20 px-2 py-1 text-xs font-medium text-green-300"
															>Tool: {entry.data.name}</span
														>
														{#if entry.data.status === 'building'}
															<span class="text-xs text-blue-400">🔧 Building...</span>
														{:else if entry.data.status === 'executing'}
															<span class="text-xs text-yellow-400">⚡ Executing...</span>
														{:else if entry.data.status === 'completed'}
															<span class="text-xs text-green-400">✓ Completed</span>
														{/if}
													</div>
												</div>
												{#if entry.data.input}
													<div>
														<span class="text-sm font-medium text-neutral-400">Input:</span>
														{#if typeof entry.data.inputObject === 'object'}
															<div class="max-w-full overflow-x-auto rounded bg-neutral-900/50 p-2">
																{@html shikiStore.highlightJsonIfPossible(entry.data.inputObject)}
															</div>
														{:else}
															<div
																class="mt-1 max-h-32 max-w-full overflow-x-auto overflow-y-auto rounded bg-neutral-900/50 p-2 text-neutral-300"
															>
																{entry.data.input}
															</div>
														{/if}
													</div>
												{/if}
												{#if entry.data.output}
													<div>
														<span class="text-sm font-medium text-neutral-400">Output:</span>
														{#if typeof entry.data.outputObject === 'object'}
															<div class="max-w-full overflow-x-auto rounded bg-neutral-900/50 p-2">
																{@html shikiStore.highlightJsonIfPossible(entry.data.outputObject)}
															</div>
														{:else}
															<div
																class="mt-1 max-h-32 overflow-x-auto overflow-y-auto rounded bg-neutral-900/50 p-2 text-neutral-300"
															>
																{entry.data.output}
															</div>
														{/if}
													</div>
												{/if}
											</div>
										{:else if entry.kind === 'break'}
											<div class="flex items-center justify-center py-4">
												<div class="h-px flex-1 bg-neutral-700"></div>
												<span class="mx-4 text-xs text-neutral-500">Step Complete</span>
												<div class="h-px flex-1 bg-neutral-700"></div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<div class="flex h-full items-center justify-center text-neutral-500">
								<p>Full stream will appear here...</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if isConsumingOrStarting}
		<div class="fixed top-4 right-4 z-50">
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
</main>
