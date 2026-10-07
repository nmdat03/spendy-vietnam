<script lang="ts">
	// BottomSheet: full-screen modal that slides up from the bottom (GSAP),
	// restyled to the fintech design language — card surface, 28px top radius,
	// blurred backdrop, centered strong title and a quiet close button.
	// API is FROZEN (open / title / onClose) — TransactionDetail depends on it.
	import { onMount, onDestroy } from 'svelte';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		open: boolean;
		title?: string;
		onClose: () => void;
		children: import('svelte').Snippet;
	}
	let { open, title, onClose, children }: Props = $props();

	let sheet = $state<HTMLDivElement | null>(null);
	let backdrop = $state<HTMLDivElement | null>(null);

	function show() {
		if (!sheet || !backdrop) return;
		if (motionReduced()) {
			gsap.set(sheet, { y: 0 });
			gsap.set(backdrop, { opacity: 1, pointerEvents: 'auto' });
			return;
		}
		gsap.set(backdrop, { opacity: 0, pointerEvents: 'auto' });
		gsap.set(sheet, { y: '100%' });
		gsap.to(backdrop, { opacity: 1, duration: 0.3, ease: 'power2.out' });
		gsap.to(sheet, { y: 0, duration: 0.5, ease: EASES.outBack });
	}

	function hide(cb?: () => void) {
		if (!sheet || !backdrop) {
			cb?.();
			return;
		}
		if (motionReduced()) {
			gsap.set(sheet, { y: '100%' });
			gsap.set(backdrop, { opacity: 0, pointerEvents: 'none' });
			cb?.();
			return;
		}
		gsap.to(backdrop, { opacity: 0, duration: 0.25, ease: 'power2.in' });
		gsap.to(sheet, {
			y: '100%',
			duration: 0.32,
			ease: 'power3.in',
			onComplete: () => {
				gsap.set(backdrop, { pointerEvents: 'none' });
				cb?.();
			}
		});
	}

	$effect(() => {
		if (open) show();
		else hide();
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) onClose();
	}
	onMount(() => window.addEventListener('keydown', onKey));
	onDestroy(() => {
		window.removeEventListener('keydown', onKey);
		gsap.killTweensOf([sheet, backdrop].filter(Boolean) as HTMLElement[]);
	});
</script>

<div class="backdrop" bind:this={backdrop} onclick={onClose} aria-hidden="true"></div>
<div class="sheet" bind:this={sheet} role="dialog" aria-modal="true" aria-label={title}>
	<button class="handle" onclick={onClose} aria-label="Tutup" tabindex="0"></button>
	{#if title}
		<header class="head">
			<h2>{title}</h2>
			<button class="close touch" onclick={onClose} aria-label="Tutup">
				<Icon name="x" size={15} />
			</button>
		</header>
	{/if}
	<div class="content scroll-y no-scrollbar">
		{@render children()}
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: oklch(0.16 0.01 265 / 0.42);
		z-index: 50;
		pointer-events: none;
		opacity: 0;
		backdrop-filter: blur(3px);
		-webkit-backdrop-filter: blur(3px);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 51;
		max-width: 440px;
		margin: 0 auto;
		background: var(--card);
		border-radius: var(--r-xl) var(--r-xl) 0 0;
		box-shadow: var(--shadow-lg);
		max-height: 92dvh;
		display: flex;
		flex-direction: column;
		will-change: transform;
		padding-bottom: var(--safe-bottom);
	}
	.handle {
		width: 44px;
		height: 5px;
		border-radius: 999px;
		background: var(--border);
		margin: 12px auto 2px;
		flex-shrink: 0;
	}
	.head {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px 52px 12px;
	}
	.head h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 700;
		letter-spacing: -0.02em;
		text-align: center;
	}
	.close {
		position: absolute;
		right: 16px;
		top: 4px;
		width: 30px;
		height: 30px;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--muted);
		color: var(--muted-foreground);
	}
	.close:hover {
		background: var(--secondary);
	}
	.content {
		padding: 0 20px 20px;
		flex: 1;
		min-height: 0;
	}
</style>
