// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { UserData } from '@onlyone/shared';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: UserData | null;
		}
		interface PageData {
			user?: UserData | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
