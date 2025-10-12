import { redirect } from '@sveltejs/kit';
import { gameServerAPI } from '$lib/api/gameserver.js';
import type { Room } from '@onlyone/shared';


export async function load({ params, cookies }) {
	// Check room access
	const roomStatus: Partial<Room> = await gameServerAPI.checkRoomStatus(params.roomName);
	console.log('Room status:', roomStatus);
	if (!roomStatus) {
		// Room doesn't exist - set toast cookie and redirect
		cookies.set('toast', 'Room not found', {
			path: '/',
			maxAge: 60,
			httpOnly: false
		});
		throw redirect(303, '/lobby');
	}

	// if (roomStatus.data && !roomStatus.data.canJoin) {
	// 	// Can't join room (full, etc.) - set toast cookie and redirect
	// 	const reason = roomStatus.data.reason || 'Cannot join room';
	// 	console.log('Cannot join room:', reason);
	// 	cookies.set('toast', reason, {
	// 		path: '/',
	// 		maxAge: 60,
	// 		httpOnly: false
	// 	});
	// 	throw redirect(303, '/lobby');
	// }

	return {
		roomName: params.roomName,
		alreadyJoined: roomStatus?.alreadyJoined || false
	};
}

export const prerender = false;
