import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';

type RoomStatusData = {
	canJoin: boolean;
	reason?: string;
	alreadyJoined?: boolean;
};

export async function load({ params, parent, cookies }) {
	const { user } = await parent();

	// Check room access
	const roomStatus: { success: boolean; data?: RoomStatusData | null } = await gameServerAPI.checkRoomStatus(params.roomName);

	if (!roomStatus.success) {
		// Room doesn't exist - set toast cookie and redirect
		cookies.set('toast', 'Room not found', {
			path: '/',
			maxAge: 60,
			httpOnly: false
		});
		throw redirect(303, '/lobby');
	}

	if (roomStatus.data && !roomStatus.data.canJoin) {
		// Can't join room (full, etc.) - set toast cookie and redirect
		const reason = roomStatus.data.reason || 'Cannot join room';
		cookies.set('toast', reason, {
			path: '/',
			maxAge: 60,
			httpOnly: false
		});
		throw redirect(303, '/lobby');
	}

	return {
		roomName: params.roomName,
		alreadyJoined: roomStatus.data?.alreadyJoined || false
	};
}

export const prerender = false;
