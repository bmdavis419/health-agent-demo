<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setShikiStore } from '$lib/stores/ShikiStore.svelte';
	setShikiStore();

	let { children } = $props();
</script>

<svelte:head>
	<title>Health Agent App</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
