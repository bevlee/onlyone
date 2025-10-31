import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast as sonnerToast } from 'svelte-sonner';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Show toast notifications using svelte-sonner
 */
export const toast = {
	error: (message: string) => {
		sonnerToast.error(message);
	},
	success: (message: string) => {
		sonnerToast.success(message);
	},
	info: (message: string) => {
		sonnerToast.info(message);
	}
};

/**
 * Set a toast message cookie for display after redirect
 */
export function setToastCookie(message: string) {
	document.cookie = `toast=${encodeURIComponent(message)}; path=/; max-age=60; SameSite=Lax`;
}
