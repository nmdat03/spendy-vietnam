<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';
	import DialogClose from './dialog-close.svelte';
	import XIcon from 'lucide-svelte/icons/x';

	interface Props {
		class?: string;
		children?: import('svelte').Snippet;
		showClose?: boolean;
	}

	let { class: className = '', children, showClose = true }: Props = $props();
</script>

<DialogPrimitive.Portal>
	<DialogPrimitive.Content
		class={cn(
			'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-[460px] flex-col overflow-y-auto rounded-t-[28px] border border-border bg-card px-5 pt-3 pb-[calc(20px+var(--safe-bottom))] shadow-lg outline-none data-[state=open]:animate-sheet-in',
			className
		)}
	>
		<div class="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-border" aria-hidden="true"></div>
		{@render children?.()}
		{#if showClose}
			<DialogClose
				class="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary"
				aria-label="Tutup"
			>
				<XIcon size={16} />
			</DialogClose>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
