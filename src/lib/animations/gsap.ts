import { gsap } from 'gsap';
import { Flip } from 'gsap/dist/Flip';

// Only register what we actually use. ScrollTrigger / Draggable / InertiaPlugin
// were previously imported but never used — pulling them in bloated the bundle
// with ~50 KB of dead code. Add them back here only when a feature needs them.
gsap.registerPlugin(Flip);

export { gsap, Flip };

// Honour prefers-reduced-motion: returns true when we should skip heavy animation.
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Spring-ish easing curves (custom Bezier) used across the app for a "premium" feel.
export const EASES = {
	out: 'power3.out',
	outBack: 'back.out(1.4)',
	spring: 'elastic.out(1, 0.5)',
	inOut: 'power2.inOut',
	smoother: 'power4.out'
} as const;

// Cleanup helper: kills a timeline safely.
export function killTimeline(tl: gsap.core.Timeline | null): void {
	if (tl) tl.kill();
}

// Stagger helper that respects reduced motion (returns 0 stagger if reduced).
export function stagger(base: number, reduced = false): number {
	return reduced ? 0 : base;
}
