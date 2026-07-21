<script lang="ts">
	// BottomSheet: full-screen modal that slides up from the bottom (GSAP).
	// Emits `close` on backdrop tap / drag-down handle / Esc.
	import { onMount, onDestroy } from 'svelte';
	import { gsap, EASES, prefersReducedMotion } from '$lib/animations/gsap';

	interface Props {
		open: boolean;
		title?: string;
		onClose: () => void;
		children: import('svelte').Snippet;
	}
	let { open, title, onClose, children }: Props = $props();

	let sheet = $state<HTMLDivElement | null>(null);
	let backdrop = $state<HTMLDivElement | null>(null);
	const reduced = prefersReducedMotion();

	function show() {
		if (!sheet || !backdrop) return;
		if (reduced) {
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
		if (reduced) {
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
<div
	class="sheet"
	bind:this={sheet}
	role="dialog"
	aria-modal="true"
	aria-label={title}
>
	<button class="handle" onclick={onClose} aria-label="Tutup" tabindex="0"></button>
	{#if title}
		<header class="head">
			<h2>{title}</h2>
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
		background: rgba(8, 12, 22, 0.45);
		z-index: 50;
		pointer-events: none;
		opacity: 0;
		backdrop-filter: blur(2px);
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 51;
		max-width: 440px;
		margin: 0 auto;
		background: var(--surface);
		border-radius: 28px 28px 0 0;
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
		margin: 10px auto 4px;
	}
	.head {
		padding: 6px 22px 14px;
	}
	.head h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.content {
		padding: 0 22px 24px;
		flex: 1;
		min-height: 0;
	}
</style>