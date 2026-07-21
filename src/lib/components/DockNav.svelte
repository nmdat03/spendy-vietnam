<script lang="ts" module>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { gsap, Flip, EASES, prefersReducedMotion } from '$lib/animations/gsap';
	import Icon from './Icon.svelte';

	interface DockItem {
		key: string;
		href: string;
		icon: string;
		label: string;
		center?: boolean;
	}

	const items: DockItem[] = [
		{ key: 'home', href: '/', icon: 'home', label: 'Home' },
		{ key: 'add', href: '/add', icon: 'plus', label: 'Add', center: true },
		{ key: 'settings', href: '/settings', icon: 'settings', label: 'Akun' }
	];
</script>

<script lang="ts">
	let pillEl = $state<HTMLDivElement | null>(null);
	const reduced = prefersReducedMotion();

	// Current path from SvelteKit page store; derive active item from it.
	let currentPath = $derived($page.url.pathname);
	let activeKey = $derived(
		currentPath === '/' ? 'home' : currentPath.startsWith('/settings') ? 'settings' : 'add'
	);

	// Move the active pill to the active icon using GSAP Flip (morph width+position).
	$effect(() => {
		activeKey;
		const target = document.querySelector<HTMLElement>(`[data-dock-key="${activeKey}"]`);
		if (!target || !pillEl) return;
		if (reduced) {
			gsap.set(pillEl, { left: target.offsetLeft, width: target.offsetWidth });
			return;
		}
		const state = Flip.getState(pillEl);
		gsap.set(pillEl, { left: target.offsetLeft, width: target.offsetWidth });
		Flip.from(state, {
			duration: 0.42,
			ease: EASES.outBack,
			absolute: true,
			props: 'left,width'
		});
		// Bounce the icon a little.
		const iconEl = target.querySelector('.dock-icon');
		if (iconEl) {
			gsap.fromTo(iconEl, { scale: 0.82 }, { scale: 1, duration: 0.5, ease: EASES.outBack });
		}
	});

	function go(item: DockItem) {
		if (item.href === currentPath) return;
		void goto(item.href);
	}
</script>

<nav class="dock" aria-label="Primary">
	<div class="dock-inner">
		<div class="pill" bind:this={pillEl} aria-hidden="true"></div>
		{#each items as item (item.key)}
			<button
				class="item"
				class:center={item.center}
				class:active={activeKey === item.key}
				data-dock-key={item.key}
				onclick={() => go(item)}
				aria-label={item.label}
				aria-current={activeKey === item.key ? 'page' : undefined}
			>
				<span class="dock-icon">
					<Icon name={item.icon} size={22} />
				</span>
				{#if activeKey === item.key}
					<span class="label">{item.label}</span>
				{/if}
			</button>
		{/each}
	</div>
</nav>

<style>
	.dock {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		bottom: calc(14px + var(--safe-bottom));
		z-index: 40;
		width: min(420px, calc(100vw - 24px));
	}
	.dock-inner {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		align-items: center;
		background: #0b0f17;
		border-radius: 999px;
		padding: 8px;
		box-shadow: var(--shadow-lg);
		gap: 4px;
	}
	.pill {
		position: absolute;
		top: 8px;
		height: calc(100% - 16px);
		left: 8px;
		width: 70px;
		background: var(--blue);
		border-radius: 999px;
		pointer-events: none;
		z-index: 0;
	}
	.item {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 52px;
		padding: 0 16px;
		border-radius: 999px;
		color: rgba(255, 255, 255, 0.78);
		transition: color 0.2s ease;
	}
	.item.active {
		color: #fff;
	}
	.item.center {
		background: rgba(255, 255, 255, 0.06);
	}
	.item.center.active {
		background: transparent;
	}
	.dock-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.label {
		font-size: 14px;
		font-weight: 600;
		white-space: nowrap;
	}
	@media (prefers-reduced-motion: reduce) {
		.pill {
			transition: left 0.2s ease, width 0.2s ease;
		}
	}
</style>