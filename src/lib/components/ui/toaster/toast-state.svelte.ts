// Minimal toast store. No dependency — pairs with toaster.svelte.
export interface ToastItem {
	id: number;
	msg: string;
	kind: 'default' | 'success' | 'error';
}

let seq = 0;
let toasts = $state<ToastItem[]>([]);

export const toastState = {
	get toasts() {
		return toasts;
	}
};

export function toast(msg: string, kind: ToastItem['kind'] = 'default'): void {
	const id = ++seq;
	toasts = [...toasts, { id, msg, kind }];
	setTimeout(() => dismissToast(id), 2600);
}

export function dismissToast(id: number): void {
	toasts = toasts.filter((t) => t.id !== id);
}
