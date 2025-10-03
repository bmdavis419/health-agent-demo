<script lang="ts">
	let { children } = $props();
</script>

<div class="flex h-screen w-full flex-col overflow-y-auto">
	<nav class="">
		<div class="flex gap-2 bg-neutral-900 p-2 shadow-lg">
			<a
				href="/sandbox/sse"
				class="rounded px-3 py-1 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
			>
				SSE
			</a>
			<a
				href="/sandbox/text"
				class="rounded px-3 py-1 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
			>
				Text
			</a>
		</div>
	</nav>
	{@render children()}
</div>
