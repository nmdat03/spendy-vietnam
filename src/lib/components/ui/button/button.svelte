<script lang="ts" module>
	import { cn } from '$lib/utils';

	export type ButtonVariant =
		'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
	export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';

	const variants: Record<ButtonVariant, string> = {
		default: 'bg-primary text-primary-foreground shadow-sm hover:opacity-90',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
		outline: 'border border-border bg-card text-foreground shadow-sm hover:bg-muted',
		ghost: 'text-foreground hover:bg-muted',
		destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
		link: 'text-foreground underline-offset-4 hover:underline'
	};

	const sizes: Record<ButtonSize, string> = {
		default: 'h-11 px-5 text-[15px]',
		sm: 'h-9 px-3.5 text-[13px]',
		lg: 'h-[52px] px-7 text-base',
		icon: 'size-11',
		'icon-sm': 'size-9'
	};

	const base =
		'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-tight transition-[background,color,opacity,border-color] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]';
</script>

<script lang="ts">
	interface Props {
		variant?: ButtonVariant;
		size?: ButtonSize;
		class?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		id?: string;
		'aria-label'?: string;
		onclick?: (e: MouseEvent) => void;
		children?: import('svelte').Snippet;
	}

	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		type = 'button',
		disabled = false,
		id = undefined,
		'aria-label': ariaLabel = undefined,
		onclick,
		children
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	{id}
	{onclick}
	aria-label={ariaLabel}
	class={cn(base, variants[variant], sizes[size], className)}
>
	{@render children?.()}
</button>
