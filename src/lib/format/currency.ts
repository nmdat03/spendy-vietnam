// Currency formatting helpers using Intl.NumberFormat.
// One formatter is cached per currency+locale to keep formatting snappy.

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale = 'en-US'): Intl.NumberFormat {
	const key = `${locale}:${currency}`;
	let fmt = formatterCache.get(key);
	if (!fmt) {
		try {
			fmt = new Intl.NumberFormat(locale, {
				style: 'currency',
				currency,
				minimumFractionDigits: currencyFractionDigits(currency),
				maximumFractionDigits: currencyFractionDigits(currency)
			});
		} catch {
			fmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		}
		formatterCache.set(key, fmt);
	}
	return fmt;
}

function currencyFractionDigits(currency: string): number {
	// IDR uses whole rupiah by convention; others use 2.
	if (currency === 'IDR') return 0;
	if (['JPY', 'KRW', 'VND'].includes(currency)) return 0;
	return 2;
}

export function formatCurrency(amount: number, currency: string, withSign = false): string {
	const formatted = getFormatter(currency).format(Math.abs(amount));
	// Always show '-' for negatives; only show '+' for positives when withSign.
	const sign = amount < 0 ? '-' : withSign && amount > 0 ? '+' : '';
	return sign + formatted;
}

// Returns just the currency symbol, e.g. "Rp", "$", "€".
export function currencySymbol(currency: string): string {
	const parts = getFormatter(currency).formatToParts(0);
	return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

// Splits a numeric amount into integer + fraction parts (for SlotNumber).
export function splitAmount(
	amount: number,
	currency: string
): {
	sign: string;
	integer: string;
	fraction: string;
} {
	const negative = amount < 0;
	const abs = Math.abs(amount);
	const digits = currencyFractionDigits(currency);
	const factor = 10 ** digits;
	const intPart = Math.floor(abs);
	const fracPart = Math.round((abs - intPart) * factor);
	const integerStr = intPart.toLocaleString('en-US');
	const fractionStr = digits > 0 ? fracPart.toString().padStart(digits, '0') : '';
	return {
		sign: negative ? '-' : '',
		integer: integerStr,
		fraction: fractionStr
	};
}

export const SUPPORTED_CURRENCIES = [
	'IDR',
	'USD',
	'EUR',
	'SGD',
	'JPY',
	'GBP',
	'AUD',
	'CAD',
	'KRW',
	'VND'
];
