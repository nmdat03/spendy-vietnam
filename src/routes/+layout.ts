// App is client-side only: IndexedDB / GSAP / Service Worker need the browser.
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'ignore';

import type { Load } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { ensureSeed, getSetting } from '$lib/db';

// Root guard: first-time users land on /onboarding; once they finish we set
// settings.hasOnboarded = true and this guard lets them through to the app.
export const load: Load = async ({ url }) => {
	await ensureSeed();
	const onboarded = (await getSetting<boolean>('hasOnboarded', false)) as boolean;
	const onOnboarding = url.pathname.startsWith('/onboarding');
	if (!onboarded && !onOnboarding) {
		throw redirect(307, '/onboarding');
	}
	if (onboarded && onOnboarding) {
		throw redirect(307, '/');
	}
	return { onboarded };
};
