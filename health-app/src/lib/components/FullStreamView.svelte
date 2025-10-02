<script lang="ts">
	import { marked } from 'marked';
	import { type BetterStreamChunk } from '$lib/schemas';
	import type { StreamEntry } from '$lib/types';
	import { getShikiStore } from '$lib/stores/ShikiStore.svelte';

	const { fullStreamChunks }: { fullStreamChunks: BetterStreamChunk[] } = $props();

	const shikiStore = getShikiStore();

	const fullStreamEntries = $derived.by((): StreamEntry[] => {
		let entries: StreamEntry[] = [];
		for (const chunk of fullStreamChunks) {
			switch (chunk.type) {
				case 'text-start':
					entries.push({
						kind: 'text',
						data: {
							id: chunk.id,
							content: '',
							completed: false
						}
					});
					break;
				case 'text-delta':
					const curEntryTextDelta = entries.find(
						(e) => e.kind === 'text' && e.data.id === chunk.id
					);
					if (curEntryTextDelta && curEntryTextDelta.kind === 'text') {
						curEntryTextDelta.data.content += chunk.text;
					}
					break;
				case 'text-end':
					const curEntryTextEnd = entries.find((e) => e.kind === 'text' && e.data.id === chunk.id);
					if (curEntryTextEnd && curEntryTextEnd.kind === 'text') {
						curEntryTextEnd.data.completed = true;
					}
					break;
				case 'reasoning-start':
					entries.push({
						kind: 'reasoning',
						data: {
							id: chunk.id,
							content: '',
							completed: false
						}
					});
					break;
				case 'reasoning-delta':
					const curEntryReasoningDelta = entries.find(
						(e) => e.kind === 'reasoning' && e.data.id === chunk.id
					);
					if (curEntryReasoningDelta && curEntryReasoningDelta.kind === 'reasoning') {
						curEntryReasoningDelta.data.content += chunk.text;
					}
					break;
				case 'reasoning-end':
					const curEntryReasoningEnd = entries.find(
						(e) => e.kind === 'reasoning' && e.data.id === chunk.id
					);
					if (curEntryReasoningEnd && curEntryReasoningEnd.kind === 'reasoning') {
						curEntryReasoningEnd.data.completed = true;
					}
					break;
				case 'tool-input-start':
					entries.push({
						kind: 'tool',
						data: {
							id: chunk.id,
							name: chunk.toolName,
							status: 'building',
							input: '',
							output: ''
						}
					});
					break;
				case 'tool-input-delta':
					const curEntryToolInputDelta = entries.find(
						(e) => e.kind === 'tool' && e.data.id === chunk.id
					);
					if (curEntryToolInputDelta && curEntryToolInputDelta.kind === 'tool') {
						curEntryToolInputDelta.data.input += chunk.delta;
					}
					break;
				case 'tool-input-end':
					const curEntryToolInputEnd = entries.find(
						(e) => e.kind === 'tool' && e.data.id === chunk.id
					);
					if (curEntryToolInputEnd && curEntryToolInputEnd.kind === 'tool') {
						curEntryToolInputEnd.data.status = 'executing';
					}
					break;
				case 'tool-call':
					const curEntryToolCall = entries.find(
						(e) => e.kind === 'tool' && e.data.id === chunk.toolCallId
					);
					if (curEntryToolCall && curEntryToolCall.kind === 'tool') {
						curEntryToolCall.data.status = 'executing';
						if (chunk.input) {
							const input = chunk.input;
							if (typeof input === 'string') {
								curEntryToolCall.data.input = input;
							} else {
								curEntryToolCall.data.inputObject = input;
							}
						}
					}
					break;
				case 'tool-result':
					const curEntryToolResult = entries.find(
						(e) => e.kind === 'tool' && e.data.id === chunk.toolCallId
					);
					if (curEntryToolResult && curEntryToolResult.kind === 'tool') {
						curEntryToolResult.data.status = 'completed';
						if (chunk.output) {
							const output = chunk.output;
							if (typeof output === 'string') {
								curEntryToolResult.data.output = output;
							} else {
								curEntryToolResult.data.outputObject = output;
							}
						}
					}
					break;
				case 'finish-step':
					entries.push({
						kind: 'break',
						data: null
					});
					break;
				default:
					break;
			}
		}
		if (entries.length > 0 && entries[entries.length - 1].kind === 'break') {
			entries.pop();
		}
		return entries;
	});
</script>

<div class="flex h-full flex-col py-6">
	<h2 class="mb-3 flex-shrink-0 px-8 text-lg font-semibold text-neutral-200">Full Stream</h2>
	<div class="flex-1 overflow-y-auto bg-neutral-900 p-6 shadow-lg">
		{#if fullStreamEntries.length > 0}
			<div class="space-y-4">
				{#each fullStreamEntries as entry}
					<div class="w-full rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
						{#if entry.kind === 'text'}
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<span class="rounded bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-300"
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
