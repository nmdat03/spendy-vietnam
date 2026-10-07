<script lang="ts">
	import { toastState, dismissToast } from './toast-state.svelte';
	import Icon from '$lib/components/Icon.svelte';

	const iconFor = { default: 'info', success: 'check', error: 'x' } as const;
</script>

{#if toastState.toasts.length > 0}
	<div
		class="fixed inset-x-0 bottom-[calc(92px+var(--safe-bottom))] z-[60] flex flex-col items-center gap-2 px-4"
	>
		{#each toastState.toasts as t (t.id)}
			<button
				class="pointer-events-auto flex max-w-[420px] items-center gap-2.5 rounded-full border border-border bg-primary px-4 py-2.5 text-[13.5px] font-semibold text-primary-foreground shadow-lg data-[state=open]:animate-pop-in"
				onclick={() => dismissToast(t.id)}
			>
				<span
					class="flex size-5 items-center justify-center rounded-full"
					style="background:color-mix(in oklab, {t.kind === 'success'
						? 'var(--success)'
						: t.kind === 'error'
							? 'var(--destructive)'
							: 'var(--primary-foreground)'} 18%, transparent)"
				>
					<Icon
						name={iconFor[t.kind]}
						size={12}
						color={t.kind === 'success'
							? 'var(--success)'
							: t.kind === 'error'
								? 'var(--destructive)'
								: 'var(--primary-foreground)'}
					/>
				</span>
				{t.msg}
			</button>
		{/each}
	</div>
{/if}
