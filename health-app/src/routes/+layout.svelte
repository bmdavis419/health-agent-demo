<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setShikiStore } from '$lib/stores/ShikiStore.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children } = $props();

	setShikiStore();

	onMount(() => {
		if (page.route.id !== '/sandbox/sse' && page.route.id !== '/sandbox/text') {
			goto('/sandbox/text');
		}
	});
</script>

<svelte:head>
	<title>Health Agent App</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
