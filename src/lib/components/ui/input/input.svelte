<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		value?: string | number;
		type?: string;
		placeholder?: string;
		inputmode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url';
		min?: string | number;
		max?: string | number;
		disabled?: boolean;
		id?: string;
		class?: string;
		oninput?: (e: Event & { currentTarget: HTMLInputElement }) => void;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let {
		value = $bindable(''),
		type = 'text',
		placeholder,
		inputmode,
		min,
		max,
		disabled = false,
		id,
		class: className = '',
		oninput,
		onchange
	}: Props = $props();

	const base =
		'flex h-11 w-full rounded-[14px] border border-input bg-card px-3.5 text-[15px] font-medium text-foreground tracking-tight shadow-[0_1px_2px_oklch(0_0_0/0.03)] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50';
</script>

<input
	bind:value
	{type}
	{placeholder}
	{inputmode}
	{min}
	{max}
	{disabled}
	{id}
	{oninput}
	{onchange}
	class={cn(base, className)}
/>
