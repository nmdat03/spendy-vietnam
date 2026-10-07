<script lang="ts" module>
	import { cn } from '$lib/utils';

	export type BadgeVariant =
		'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning' | 'violet';

	const variants: Record<BadgeVariant, string> = {
		default: 'bg-primary text-primary-foreground',
		secondary: 'bg-secondary text-secondary-foreground',
		outline: 'border border-border text-muted-foreground',
		success: 'bg-[color-mix(in_oklab,var(--success)_14%,var(--card))] text-success',
		destructive: 'bg-[color-mix(in_oklab,var(--destructive)_13%,var(--card))] text-destructive',
		warning: 'bg-[color-mix(in_oklab,var(--warning)_16%,var(--card))] text-warning',
		violet: 'bg-[color-mix(in_oklab,var(--violet)_13%,var(--card))] text-violet'
	};

	const base =
		'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap';
</script>

<script lang="ts">
	interface Props {
		variant?: BadgeVariant;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { variant = 'default', class: className = '', children }: Props = $props();
</script>

<span class={cn(base, variants[variant], className)}>
	{@render children?.()}
</span>
