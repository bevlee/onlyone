/**
 * User profile information from the database
 */
export interface UserProfile {
	id: string;
	name: string;
	email: string | null;
	avatar_url: string | null;
	gamesPlayed: number;
	gamesWon: number;
}

/**
 * Complete user data returned from authentication endpoints
 */
export interface UserData {
	auth: {
		id: string;
		email?: string;
		user_metadata?: {
			name?: string;
		};
	};
	profile: UserProfile;
	isAnonymous?: boolean;
	expiresAt?: number;
}
