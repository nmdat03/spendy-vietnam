<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	interface Props {
		checked?: boolean;
		onCheckedChange?: (checked: boolean) => void;
		disabled?: boolean;
		id?: string;
		class?: string;
	}

	let {
		checked = $bindable(false),
		onCheckedChange,
		disabled = false,
		id,
		class: className = ''
	}: Props = $props();
</script>

<SwitchPrimitive.Root
	bind:checked
	{onCheckedChange}
	{disabled}
	{id}
	class={cn(
		'inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
		className
	)}
>
	<SwitchPrimitive.Thumb
		class="pointer-events-none block size-6 rounded-full bg-card shadow-md ring-1 ring-black/5 transition-transform data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]"
	/>
</SwitchPrimitive.Root>
