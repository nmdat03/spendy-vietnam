<script lang="ts" module>
	// Icon.svelte — renders a lucide icon by its kebab-case name (used in categories).
	// We curate a known icon set so dynamic rendering is safe & tree-shakeable.
	import {
		Utensils,
		Car,
		ShoppingBag,
		Film,
		Receipt,
		HeartPulse,
		Wallet,
		Gift,
		TrendingUp,
		CircleEllipsis,
		Plus,
		Home,
		Settings,
		Star,
		Snowflake,
		CreditCard,
		Plane,
		House,
		Briefcase,
		Coffee,
		Gamepad2,
		GraduationCap,
		PiggyBank,
		BookOpen,
		Smartphone,
		Bus,
		Bike,
		TrainFront,
		ShoppingCart,
		Dumbbell,
		PawPrint,
		Baby,
		ChevronLeft,
		ChevronRight,
		Pencil,
		Trash2,
		ArrowUpRight,
		ArrowDownRight,
		type Icon as IconType
	} from 'lucide-svelte';

	const map: Record<string, typeof IconType> = {
		utensils: Utensils,
		car: Car,
		'shopping-bag': ShoppingBag,
		'shopping-cart': ShoppingCart,
		film: Film,
		receipt: Receipt,
		'heart-pulse': HeartPulse,
		wallet: Wallet,
		gift: Gift,
		'trending-up': TrendingUp,
		'circle-ellipsis': CircleEllipsis,
		plus: Plus,
		home: Home,
		house: House,
		settings: Settings,
		star: Star,
		snowflake: Snowflake,
		'credit-card': CreditCard,
		plane: Plane,
		briefcase: Briefcase,
		coffee: Coffee,
		gamepad: Gamepad2,
		'graduation-cap': GraduationCap,
		'piggy-bank': PiggyBank,
		'book-open': BookOpen,
		smartphone: Smartphone,
		bus: Bus,
		bike: Bike,
		train: TrainFront,
		dumbbell: Dumbbell,
		'paw-print': PawPrint,
		baby: Baby,
		'chevron-left': ChevronLeft,
		'chevron-right': ChevronRight,
		pencil: Pencil,
		'trash-2': Trash2,
		'arrow-up-right': ArrowUpRight,
		'arrow-down-right': ArrowDownRight
	};

	export const ICON_NAMES = Object.keys(map);
</script>

<script lang="ts">
	interface Props {
		name: string;
		size?: number | string;
		strokeWidth?: number;
		class?: string;
		color?: string;
	}
	let { name, size = 20, strokeWidth = 2, class: klass = '', color }: Props = $props();
	const Cmp = $derived(map[name] ?? CircleEllipsis);
</script>

<Cmp {size} {strokeWidth} class={klass} {color} />