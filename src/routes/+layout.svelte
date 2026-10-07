<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { settings, effectiveTheme, motionReduced } from '$lib/state/settings.svelte';
	import { ensureSeed } from '$lib/db';
	import DockNav from '$lib/components/DockNav.svelte';
	import { Toaster } from '$lib/components/ui/toaster';

	let { children, data } = $props();

	let ready = $state(false);
	// Onboarding is full-bleed and shows no dock / page wrapper.
	let onboarding = $derived(data?.onboarded === false);

	function hideSplash() {
		const splash = document.getElementById('splash');
		if (!splash) return;
		splash.classList.add('hidden');
		setTimeout(() => splash.remove(), 400);
	}

	onMount(() => {
		// iOS ignores user-scalable=no, so block pinch-zoom gestures explicitly.
		const preventGesture = (e: Event) => e.preventDefault();
		const preventMultiTouch = (e: TouchEvent) => {
			if (e.touches.length > 1) e.preventDefault();
		};
		document.addEventListener('gesturestart', preventGesture);
		document.addEventListener('gesturechange', preventGesture);
		document.addEventListener('touchmove', preventMultiTouch, { passive: false });
		(async () => {
			await ensureSeed();
			await settings.load();
			ready = true;
			hideSplash();
		})();
		return () => {
			document.removeEventListener('gesturestart', preventGesture);
			document.removeEventListener('gesturechange', preventGesture);
			document.removeEventListener('touchmove', preventMultiTouch);
		};
	});

	// Keep <html data-theme> in sync with the effective theme (handles auto).
	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', effectiveTheme());
		}
	});

	// Keep <html data-reduce-motion> in sync so CSS can disable transitions globally.
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (motionReduced()) {
				document.documentElement.setAttribute('data-reduce-motion', '');
			} else {
				document.documentElement.removeAttribute('data-reduce-motion');
			}
		}
	});
</script>

<div class="bg-glow" aria-hidden="true"></div>

<div class="app-shell" class:onboarding>
	{#if ready}
		{#if onboarding}
			<div class="page-full">{@render children()}</div>
		{:else}
			<div class="page">
				{@render children()}
			</div>
		{/if}
	{/if}
</div>

{#if !onboarding}
	<DockNav />
{/if}

<Toaster />

<style>
	.app-shell {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.page {
		flex: 1;
		width: 100%;
		max-width: 440px;
		margin: 0 auto;
		padding: calc(16px + var(--safe-top)) 16px calc(140px + var(--safe-bottom));
	}
	.page-full {
		position: relative;
		width: 100%;
		min-height: 100dvh;
	}
</style>
