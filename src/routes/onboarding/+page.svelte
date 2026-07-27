<script lang="ts">
	// Onboarding (first-run). 3-phase full-screen flow with GSAP transitions.
	//
	// Phases: A) Brand intro → B) Education carousel → C) Setup saldo awal → D) confirm.
	// Transitions are GSAP (no page reload). The dock is hidden by the root
	// layout while `data.onboarded === false`.
	//
	// DATA NOTE (saldo awal): we deliberately store saldo awal as settings fields
	// (`startingBalanceCash` / `startingBalanceDebit`) and NOT as a special
	// "Saldo Awal" transaction. Reason: the balance is computed as
	// `startingBalance + sum(transactions)`, so recording saldo awal as a
	// transaction would double-count it. Keeping it as a field also keeps the
	// transaction history clean (saldo awal is a starting point, not activity).
	// The dashboard's Cash/Debit balances already include these starting values.
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { gsap, EASES } from '$lib/animations/gsap';
	import { motionReduced } from '$lib/state/settings.svelte';
	import { settings } from '$lib/state/settings.svelte';
	import { currencySymbol, SUPPORTED_CURRENCIES } from '$lib/format/currency';
	import AmountKeypad from '$lib/components/AmountKeypad.svelte';
	import SlotNumber from '$lib/components/SlotNumber.svelte';
	import Icon from '$lib/components/Icon.svelte';

	type Phase = 'intro' | 'carousel' | 'name' | 'setup';
	let phase = $state<Phase>('intro');

	// ---- Intro refs ----
	let introEl = $state<HTMLElement | null>(null);
	let logoEl = $state<HTMLElement | null>(null);
	let wordEl = $state<HTMLElement | null>(null);
	let taglineEl = $state<HTMLElement | null>(null);
	let introTimer: ReturnType<typeof setTimeout> | null = null;
	const wordLetters = 'Spendy'.split('');

	// ---- Carousel ----
	const slides = [
		{
			title: 'Catat dalam hitungan detik',
			desc: 'Input nominal & kategori secepat mungkin lewat keypad besar.'
		},
		{
			title: 'Lihat ke mana uangmu pergi',
			desc: 'Insight otomatis lewat grafik pie & tren per kategori.'
		},
		{
			title: 'Aman & offline-first',
			desc: 'Data tersimpan di perangkatmu, sinkron otomatis saat online.'
		}
	];
	let slide = $state(0);
	let carouselEl = $state<HTMLElement | null>(null);
	let viewportEl = $state<HTMLElement | null>(null);
	let trackEl = $state<HTMLElement | null>(null);
	let slideW = 0;
	let xOffset = 0; // current translateX of the track
	let dragging = false;
	let startClientX = 0;
	let startOffset = 0;

	// ---- Setup ----
	let setupEl = $state<HTMLElement | null>(null);
	let activeAccount = $state<'debit' | 'cash'>('debit');
	let rawDebit = $state('');
	let rawCash = $state('');
	let totalCardEl = $state<HTMLElement | null>(null);

	// ---- Name ----
	let nameEl = $state<HTMLElement | null>(null);
	let userName = $state('');

	const currency = $derived(settings.value.defaultCurrency);
	const allowDecimal = $derived(
		currency !== 'IDR' && currency !== 'JPY' && currency !== 'KRW' && currency !== 'VND'
	);
	function parseNum(s: string): number {
		return Number.parseFloat(s || '0') || 0;
	}
	const totalSaldo = $derived(parseNum(rawDebit) + parseNum(rawCash));
	const activeRaw = $derived(activeAccount === 'debit' ? rawDebit : rawCash);
	function onKeypad(v: string) {
		if (activeAccount === 'debit') rawDebit = v;
		else rawCash = v;
	}
	async function setCurrency(c: string) {
		await settings.update('defaultCurrency', c);
	}

	// ---- Finish ----
	let finishing = $state(false);

	// ============ Intro ============
	function playIntro() {
		if (!introEl) return;
		if (motionReduced()) {
			gsap.set([logoEl, wordEl, taglineEl], { opacity: 1, y: 0, scale: 1 });
			return;
		}
		gsap.from(logoEl, { scale: 0.5, opacity: 0, duration: 0.9, ease: EASES.outBack });
		gsap.from(wordEl?.querySelectorAll('span') ?? [], {
			y: 40,
			opacity: 0,
			duration: 0.6,
			ease: EASES.out,
			stagger: 0.06,
			delay: 0.35
		});
		gsap.from(taglineEl, { opacity: 0, y: 12, duration: 0.7, delay: 0.8, ease: EASES.out });
	}

	function goCarousel() {
		if (phase !== 'intro') return;
		if (introTimer) {
			clearTimeout(introTimer);
			introTimer = null;
		}
		transitionTo('carousel');
	}

	// ============ Phase transitions ============
	function transitionTo(next: Phase) {
		const oldPhase = phase;
		const elMap: Record<Phase, HTMLElement | null> = {
			intro: introEl,
			carousel: carouselEl,
			name: nameEl,
			setup: setupEl
		};
		const fromEl = elMap[oldPhase];
		const toEl = elMap[next];
		phase = next;
		const dir = phaseOrder(next) >= phaseOrder(oldPhase) ? 1 : -1;
		if (motionReduced() || !fromEl || !toEl) {
			gsap.set(fromEl, { autoAlpha: 0 });
			gsap.set(toEl, { autoAlpha: 1 });
			if (next === 'carousel') initCarousel();
			if (next === 'name') playName();
			if (next === 'setup') playSetup();
			return;
		}
		gsap.set(toEl, { autoAlpha: 0, x: dir * 40 });
		gsap.to(fromEl, {
			autoAlpha: 0,
			x: -dir * 40,
			duration: 0.4,
			ease: 'power2.in'
		});
		gsap.to(toEl, {
			autoAlpha: 1,
			x: 0,
			duration: 0.5,
			ease: EASES.out,
			delay: 0.05,
			onStart: () => {
				if (next === 'carousel') initCarousel();
				if (next === 'name') playName();
				if (next === 'setup') playSetup();
			}
		});
	}
	function phaseOrder(p: Phase): number {
		return p === 'intro' ? 0 : p === 'carousel' ? 1 : p === 'name' ? 2 : 3;
	}

	function playName() {
		if (!nameEl || motionReduced()) return;
		gsap.from(nameEl.querySelectorAll('.reveal'), {
			y: 18,
			opacity: 0,
			duration: 0.5,
			ease: EASES.out,
			stagger: 0.06
		});
	}

	// ============ Carousel drag + snap ============
	function initCarousel() {
		if (!viewportEl || !trackEl) return;
		slideW = viewportEl.offsetWidth;
		xOffset = -slide * slideW;
		gsap.set(trackEl, { x: xOffset });
		drawInActive();
	}

	function onPointerDown(e: PointerEvent) {
		if (!trackEl || !viewportEl) return;
		dragging = true;
		startClientX = e.clientX;
		startOffset = xOffset;
		gsap.killTweensOf(trackEl);
		viewportEl.setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging || !trackEl) return;
		const dx = e.clientX - startClientX;
		let next = startOffset + dx;
		// resistance at edges.
		if (next > 0) next = next * 0.35;
		const min = -((slides.length - 1) * slideW);
		if (next < min) next = min + (next - min) * 0.35;
		xOffset = next;
		gsap.set(trackEl, { x: next });
	}
	function onPointerUp() {
		if (!dragging || !trackEl) return;
		dragging = false;
		const idx = Math.round(-xOffset / slideW);
		const clamped = Math.max(0, Math.min(slides.length - 1, idx));
		slide = clamped;
		xOffset = -clamped * slideW;
		gsap.to(trackEl, { x: xOffset, duration: 0.45, ease: EASES.out, onComplete: drawInActive });
	}

	function goToSlide(i: number) {
		const clamped = Math.max(0, Math.min(slides.length - 1, i));
		slide = clamped;
		xOffset = -clamped * slideW;
		if (trackEl) {
			gsap.killTweensOf(trackEl);
			gsap.to(trackEl, { x: xOffset, duration: 0.45, ease: EASES.out, onComplete: drawInActive });
		}
	}
	function nextSlide() {
		if (slide < slides.length - 1) goToSlide(slide + 1);
		else transitionTo('name');
	}

	// Draw-in the active slide's line-art.
	function drawInActive() {
		if (motionReduced()) return;
		const slideEls = trackEl?.querySelectorAll('.slide');
		if (!slideEls) return;
		const active = slideEls[slide] as HTMLElement | undefined;
		if (!active) return;
		const draws = active.querySelectorAll<SVGGeometryElement>('.draw');
		draws.forEach((el) => {
			const len = el.getTotalLength();
			gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
		});
		gsap.to(draws, {
			strokeDashoffset: 0,
			duration: 0.9,
			ease: EASES.out,
			stagger: 0.08,
			delay: 0.05
		});
	}

	// ============ Setup ============
	function playSetup() {
		if (!setupEl || motionReduced()) return;
		gsap.from(setupEl.querySelectorAll('.reveal'), {
			y: 18,
			opacity: 0,
			duration: 0.5,
			ease: EASES.out,
			stagger: 0.06
		});
	}

	function switchAccount(acc: 'debit' | 'cash') {
		if (activeAccount === acc) return;
		activeAccount = acc;
		// Animate the stacked cards: handled via $effect on activeAccount below.
	}

	function skipSaldo() {
		rawDebit = '';
		rawCash = '';
		void finish();
	}

	async function finish() {
		if (finishing) return;
		finishing = true;
		if (totalCardEl && !motionReduced()) {
			// Handoff feel: scale the total card up + fade toward the top before
			// navigating, so the dashboard's "Total Balance" reveal reads as a
			// continuation. (A true cross-route shared-element Flip would need a
			// persistent DOM clone across the navigation; we use this coordinated
			// scale-fade handoff instead — simpler and reliable.)
			await gsap.to(totalCardEl, {
				scale: 1.08,
				y: -24,
				opacity: 0,
				duration: 0.45,
				ease: 'power2.in'
			});
		}
		await settings.update('startingBalanceDebit', parseNum(rawDebit));
		await settings.update('startingBalanceCash', parseNum(rawCash));
		if (userName.trim()) await settings.update('userName', userName.trim());
		await settings.update('hasOnboarded', true);
		await goto('/');
	}

	// Animate the stacked-card switch whenever activeAccount changes.
	$effect(() => {
		activeAccount;
		if (phase !== 'setup' || motionReduced()) return;
		const cards = setupEl?.querySelectorAll<HTMLElement>('.stack-card');
		if (!cards) return;
		cards.forEach((c) => {
			const isActive = c.dataset.acc === activeAccount;
			gsap.to(c, {
				scale: isActive ? 1 : 0.9,
				y: isActive ? 0 : 14,
				rotate: isActive ? 0 : activeAccount === 'debit' ? -3 : 3,
				opacity: isActive ? 1 : 0.85,
				zIndex: isActive ? 2 : 1,
				duration: 0.4,
				ease: EASES.outBack,
				overwrite: 'auto'
			});
		});
	});

	onMount(() => {
		playIntro();
		introTimer = setTimeout(goCarousel, 1900);
		// Pre-fill saldo from existing settings so returning users (who already set
		// a saldo awal before onboarding existed) don't lose their values.
		if (settings.value.startingBalanceDebit > 0)
			rawDebit = String(settings.value.startingBalanceDebit);
		if (settings.value.startingBalanceCash > 0)
			rawCash = String(settings.value.startingBalanceCash);
		// (Background aurora is animated globally in the root layout.)
	});

	onDestroy(() => {
		if (introTimer) clearTimeout(introTimer);
		gsap.killTweensOf(
			[introEl, carouselEl, trackEl, setupEl, totalCardEl].filter(Boolean) as HTMLElement[]
		);
	});

	const isLastSlide = $derived(slide === slides.length - 1);
</script>

<div class="onb">
	<!-- A. Brand Intro -->
	<section
		class="phase intro"
		class:active={phase === 'intro'}
		bind:this={introEl}
		role="presentation"
	>
		<div class="intro-wrap">
			<div class="logo" bind:this={logoEl}>
				<svg viewBox="0 0 512 512" width="84" height="84" aria-hidden="true">
					<defs>
						<linearGradient id="obg" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0%" stop-color="#60a5fa" />
							<stop offset="100%" stop-color="#2563eb" />
						</linearGradient>
					</defs>
					<rect x="6" y="6" width="500" height="500" rx="120" fill="#0b0f17" />
					<g transform="translate(112 150)">
						<rect x="0" y="120" width="56" height="92" rx="14" fill="url(#obg)" />
						<rect x="86" y="74" width="56" height="138" rx="14" fill="url(#obg)" />
						<rect x="172" y="28" width="56" height="184" rx="14" fill="url(#obg)" />
						<path
							d="M40 168 L120 96 L180 140 L256 56"
							fill="none"
							stroke="#f472b6"
							stroke-width="16"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
				</svg>
			</div>
			<h1 class="wordmark" bind:this={wordEl}>
				{#each wordLetters as l, i (i)}<span>{l}</span>{/each}
			</h1>
			<p class="tagline" bind:this={taglineEl}>Track your spending</p>
			<button class="tap-hint" onclick={goCarousel}>Mulai</button>
		</div>
	</section>

	<!-- B. Carousel -->
	<section
		class="phase carousel"
		class:active={phase === 'carousel'}
		bind:this={carouselEl}
		aria-label="Pengenalan"
	>
		<button class="skip" onclick={() => transitionTo('name')} aria-label="Lewati">Lewati</button>

		<div
			class="viewport"
			bind:this={viewportEl}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
			style="touch-action: none"
			role="region"
			aria-label="Carousel edukasi — geser untuk berpindah"
		>
			<div class="track" bind:this={trackEl}>
				{#each slides as s, i (i)}
					<div class="slide">
						<div class="illus">
							{#if i === 0}
								<svg
									viewBox="0 0 200 200"
									width="160"
									height="160"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<rect class="draw" x="60" y="20" width="80" height="160" rx="14" />
									<line class="draw" x1="60" y1="46" x2="140" y2="46" />
									<circle class="draw" cx="100" cy="100" r="3" />
									<circle class="draw" cx="84" cy="118" r="3" />
									<circle class="draw" cx="116" cy="118" r="3" />
									<circle class="draw" cx="84" cy="136" r="3" />
									<circle class="draw" cx="116" cy="136" r="3" />
									<path class="draw" d="M88 158 l8 8 l16 -18" stroke="var(--green)" />
								</svg>
							{:else if i === 1}
								<svg
									viewBox="0 0 200 200"
									width="160"
									height="160"
									fill="none"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle class="draw" cx="100" cy="100" r="70" stroke="var(--border)" />
									<path class="draw" d="M100 30 a70 70 0 0 1 60 106" stroke="var(--blue)" />
									<line class="draw" x1="100" y1="100" x2="100" y2="30" stroke="var(--text-3)" />
									<line class="draw" x1="100" y1="100" x2="160" y2="136" stroke="var(--text-3)" />
								</svg>
							{:else}
								<svg
									viewBox="0 0 200 200"
									width="160"
									height="160"
									fill="none"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										class="draw"
										d="M100 30 l56 22 v50 c0 38 -56 66 -56 66 s-56 -28 -56 -66 v-50 z"
										stroke="var(--blue)"
									/>
									<path class="draw" d="M74 100 l18 18 l34 -38" stroke="var(--green)" />
								</svg>
							{/if}
						</div>
						<h3 class="slide-title">{s.title}</h3>
						<p class="slide-desc">{s.desc}</p>
					</div>
				{/each}
			</div>
		</div>

		<div class="dots" aria-hidden="true">
			{#each slides as _, i (i)}
				<button
					class="dot"
					class:active={slide === i}
					onclick={() => goToSlide(i)}
					aria-label={`Slide ${i + 1}`}
				></button>
			{/each}
		</div>

		<button class="next-btn" onclick={nextSlide}>
			{#if isLastSlide}
				Mulai
			{:else}
				Lanjut
			{/if}
		</button>
	</section>

	<!-- Name input -->
	<section
		class="phase name"
		class:active={phase === 'name'}
		bind:this={nameEl}
		aria-label="Masukkan nama"
	>
		<h2 class="setup-title reveal">Hai, siapa nama kamu?</h2>
		<p class="setup-sub reveal">
			Masukkan nama panggilanmu supaya kami bisa menyapa dengan personal.
		</p>
		<div class="name-input-wrap reveal">
			<input
				class="name-input"
				type="text"
				placeholder="Nama panggilan…"
				maxlength="20"
				bind:value={userName}
				onkeydown={(e) => e.key === 'Enter' && userName.trim() && transitionTo('setup')}
			/>
		</div>
		<button
			class="next-btn reveal"
			disabled={!userName.trim()}
			onclick={() => transitionTo('setup')}>Lanjut</button
		>
	</section>

	<!-- C. Setup Saldo Awal -->
	<section
		class="phase setup"
		class:active={phase === 'setup'}
		bind:this={setupEl}
		aria-label="Setup saldo awal"
	>
		<h2 class="setup-title reveal">Yuk, mulai dari saldo kamu sekarang</h2>
		<p class="setup-sub reveal">Supaya laporan pengeluaran akurat sejak hari pertama.</p>

		<!-- Total preview with SlotNumber reveal. -->
		<div class="total-card reveal" bind:this={totalCardEl}>
			<span class="total-label">Saldo Awal Total</span>
			<div class="total-value">
				<SlotNumber value={totalSaldo} {currency} duration={1.1} stagger={0.05} />
			</div>
		</div>

		<!-- Stacked account cards: tap the back card to bring it forward. -->
		<div class="stack reveal">
			<button
				class="stack-card"
				data-acc="debit"
				class:active={activeAccount === 'debit'}
				onclick={() => switchAccount('debit')}
				aria-label="Akun Debit"
			>
				<span class="acc-ico debit"><Icon name="credit-card" size={20} /></span>
				<span class="acc-name">Debit / Bank</span>
				<span class="acc-val"
					>{currencySymbol(currency)}{parseNum(rawDebit).toLocaleString('en-US')}</span
				>
			</button>
			<button
				class="stack-card"
				data-acc="cash"
				class:active={activeAccount === 'cash'}
				onclick={() => switchAccount('cash')}
				aria-label="Akun Cash"
			>
				<span class="acc-ico cash"><Icon name="wallet" size={20} /></span>
				<span class="acc-name">Cash / Tunai</span>
				<span class="acc-val"
					>{currencySymbol(currency)}{parseNum(rawCash).toLocaleString('en-US')}</span
				>
			</button>
		</div>

		<div class="currency-pick reveal">
			{#each SUPPORTED_CURRENCIES as c (c)}
				<button class="cur" class:active={c === currency} onclick={() => setCurrency(c)}>{c}</button
				>
			{/each}
		</div>

		<div class="keypad-wrap reveal">
			<AmountKeypad value={activeRaw} {currency} {allowDecimal} onchange={onKeypad} />
		</div>

		<div class="setup-actions reveal">
			<button class="skip-step" onclick={skipSaldo} aria-label="Lewati langkah ini"
				>Lewati langkah ini</button
			>
			<button class="finish-btn" disabled={finishing} onclick={finish}>
				{finishing ? 'Menyiapkan…' : 'Mulai Pakai Spendy'}
			</button>
		</div>
	</section>
</div>

<style>
	.onb {
		position: relative;
		width: 100%;
		min-height: 100dvh;
		overflow: hidden;
	}

	.phase {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: calc(24px + var(--safe-top)) 22px calc(24px + var(--safe-bottom));
		will-change: transform, opacity;
		pointer-events: none;
	}
	.phase.active {
		pointer-events: auto;
	}
	/* Hide non-intro phases on first paint to avoid all three stacking. GSAP
	   autoAlpha takes over once transitions run. */
	.phase.carousel,
	.phase.name,
	.phase.setup {
		opacity: 0;
		visibility: hidden;
	}
	.phase.intro {
		gap: 10px;
		text-align: center;
	}
	.intro-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}
	.logo {
		display: flex;
		justify-content: center;
	}
	.wordmark {
		margin: 0;
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--text);
	}
	.wordmark :global(span) {
		display: inline-block;
	}
	.tagline {
		margin: 0;
		font-size: 15px;
		color: var(--text-2);
		font-weight: 500;
	}
	.tap-hint {
		margin-top: 24px;
		padding: 11px 28px;
		border-radius: 999px;
		background: #0b0f17;
		color: #fff;
		font-weight: 700;
		font-size: 15px;
		box-shadow: var(--shadow-md);
	}

	/* Carousel */
	.carousel {
		justify-content: flex-start;
		gap: 0;
		padding-top: calc(60px + var(--safe-top));
	}
	.skip {
		position: absolute;
		top: calc(16px + var(--safe-top));
		right: 20px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-2);
		padding: 6px 10px;
	}
	.viewport {
		overflow: hidden;
		width: 100%;
		flex: 1;
		display: flex;
		align-items: center;
		cursor: grab;
	}
	.viewport:active {
		cursor: grabbing;
	}
	.track {
		display: flex;
		width: 300%;
		flex-shrink: 0;
		will-change: transform;
	}
	.slide {
		width: calc(100% / 3);
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		padding: 0 20px;
		text-align: center;
	}
	.illus {
		color: var(--text-3);
	}
	.slide-title {
		margin: 0;
		font-size: 22px;
		font-weight: 800;
		letter-spacing: -0.01em;
		color: var(--text);
	}
	.slide-desc {
		margin: 0;
		font-size: 14px;
		color: var(--text-2);
		line-height: 1.5;
		max-width: 280px;
	}
	.dots {
		display: flex;
		gap: 8px;
		justify-content: center;
		padding: 18px 0 14px;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--border);
		transition:
			width 0.3s ease,
			background 0.3s ease;
		border: none;
	}
	.dot.active {
		width: 22px;
		background: #0b0f17;
	}
	.next-btn {
		width: 100%;
		max-width: 320px;
		height: 52px;
		border-radius: 16px;
		background: #0b0f17;
		color: #fff;
		font-weight: 700;
		font-size: 16px;
		box-shadow: var(--shadow-md);
		margin: 0 auto 8px;
	}

	/* Setup */
	.setup {
		justify-content: flex-start;
		gap: 14px;
		overflow-y: auto;
	}
	/* Prevent flex shrink: setup content can exceed the viewport and the section
	   scrolls. Without this, items with overflow (currency-pick) shrink to 0 and
	   the stacked-cards collapse. */
	:global(.phase.setup > *) {
		flex-shrink: 0;
	}
	.setup-title {
		margin: 4px 0 0;
		font-size: 22px;
		font-weight: 800;
		text-align: center;
		letter-spacing: -0.01em;
	}
	.setup-sub {
		margin: 0;
		font-size: 13px;
		color: var(--text-2);
		text-align: center;
	}
	/* Name phase */
	.name-input-wrap {
		width: 100%;
		max-width: 340px;
		margin-top: 12px;
		flex-shrink: 0;
	}
	.name-input {
		width: 100%;
		text-align: center;
		font-size: 22px;
		font-weight: 700;
		padding: 16px 20px;
		border-radius: var(--r-lg);
		border: 2px solid var(--border);
		background: var(--surface);
		color: var(--text);
		outline: none;
		transition: border-color 0.2s ease;
	}
	.name-input:focus {
		border-color: var(--blue);
	}
	.name-input::placeholder {
		color: var(--text-3);
		font-weight: 500;
	}
	.total-card {
		width: 100%;
		max-width: 360px;
		background: var(--surface);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-md);
		padding: 18px 22px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		text-align: center;
	}
	.total-label {
		font-size: 12px;
		color: var(--text-2);
		font-weight: 600;
	}
	.total-value {
		font-size: 30px;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.stack {
		position: relative;
		width: 100%;
		max-width: 360px;
		height: 96px;
		flex-shrink: 0;
	}
	.stack-card {
		position: absolute;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		height: 76px;
		padding: 0 16px;
		border-radius: var(--r-md);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		border: 2px solid transparent;
		text-align: left;
	}
	/* Initial stacked positions (debit front, cash behind) — matches the default
	   activeAccount='debit'. GSAP animates switches from here. */
	.stack-card[data-acc='debit'] {
		z-index: 2;
	}
	.stack-card[data-acc='cash'] {
		z-index: 1;
		transform: translateY(14px) scale(0.92);
		opacity: 0.85;
	}
	.stack-card.active {
		border-color: var(--blue);
	}
	.acc-ico {
		width: 38px;
		height: 38px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		flex-shrink: 0;
	}
	.acc-ico.debit {
		background: var(--blue);
	}
	.acc-ico.cash {
		background: var(--green);
	}
	.acc-name {
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
	}
	.acc-val {
		margin-left: auto;
		font-size: 14px;
		font-weight: 700;
		color: var(--text-2);
		font-variant-numeric: tabular-nums;
	}
	.currency-pick {
		display: flex;
		align-items: center;
		gap: 6px;
		overflow-x: auto;
		width: 100%;
		max-width: 360px;
		flex-shrink: 0;
	}
	.currency-pick::-webkit-scrollbar {
		display: none;
	}
	.cur {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 34px;
		line-height: 1;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		font-size: 12px;
		font-weight: 700;
		color: var(--text);
	}
	.cur.active {
		background: #0b0f17;
		color: #fff;
	}
	.keypad-wrap {
		width: 100%;
		max-width: 360px;
	}
	.setup-actions {
		width: 100%;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 8px;
	}
	.skip-step {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-3);
		padding: 6px;
	}
	.finish-btn {
		height: 52px;
		border-radius: 16px;
		background: #0b0f17;
		color: #fff;
		font-weight: 700;
		font-size: 16px;
		box-shadow: var(--shadow-md);
	}
	.finish-btn:disabled {
		opacity: 0.5;
	}
</style>
