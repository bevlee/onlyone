<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { io } from 'socket.io-client';
	import { SvelteSet } from 'svelte/reactivity';
	import ChooseCategory from '$lib/components/ChooseCategory.svelte';
	import EndGame from '$lib/components/EndGame.svelte';
	import FilterClues from '$lib/components/FilterClues.svelte';
	import GuessWord from '$lib/components/GuessWord.svelte';
	import WriteClues from '$lib/components/WriteClues.svelte';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';
	import GameInstructions from '$lib/components/GameInstructions.svelte';
	import ChangeNameModal from '$lib/components/ChangeNameModal.svelte';
	import LeaveRoomModal from '$lib/components/LeaveRoomModal.svelte';

	let { roomName, leaveRoom } = $props();

	// Initialize username properly
	const initialUsername =
		localStorage.getItem('username') || 'user' + Math.floor(Math.random() * 10000);
	let username = $state<string>(initialUsername);

	// Modal states
	let showChangeNameModal = $state(false);
	let showLeaveRoomModal = $state(false);
	let isChangingName = $state(false);

	// These need $state because they're mutated in callbacks/socket events
	let role: string = $state('');
	let votes: Array<number> = $state<Array<number>>([]);

	// These don't need $state because they're handled by Svelte's built-in reactivity
	// svelte-ignore non_reactive_update
	let categories: Array<string> = ['a', 'b', 'c'];
	// svelte-ignore non_reactive_update
	let category: string = '';
	// svelte-ignore non_reactive_update
	let clues: Array<string> = ['a', 'b', 'a'];
	// svelte-ignore non_reactive_update
	let dedupedClues: Array<string> = [];
	// svelte-ignore non_reactive_update
	let secretWord: string = 'hehexd';
	// svelte-ignore non_reactive_update
	let guess: string = '';
	// svelte-ignore non_reactive_update
	let wordGuessed: boolean = false;
	// svelte-ignore non_reactive_update
	let gamesWon: number = 0;
	// svelte-ignore non_reactive_update
	let gamesPlayed: number = 0;
	// svelte-ignore non_reactive_update
	let totalRounds: number = 0;

	// Set initial username if not already saved
	if (initialUsername.startsWith('user')) {
		setUsername(initialUsername);
	}
	let currentScene = $state<string>('main');
	let players = $state(new SvelteSet([username]));

	function setUsername(newUsername: string) {
		localStorage.setItem('username', newUsername);
		username = newUsername;
	}

	// init socket
	const socket = io(env.PUBLIC_GAMESERVER_URL, {
		auth: {
			serverOffset: 0,
			username: username,
			room: roomName
		}
	});

	socket.on('disconnect', () => {
		//send the username to the server
		console.log(`user ${socket.id} disconnected`);
	});
	socket.on('connect', () => {
		console.log(socket.auth);
	});
	socket.on('joinRoom', (roomDetails: Object) => {
		console.log('joined room which consists of: ', roomDetails);
		for (let player of Object.keys(roomDetails)) {
			players.add(player);
		}
	});

	socket.on('playerJoined', (player: string) => {
		console.log(`user ${player} joined`);
		players.add(player);
		console.log($state.snapshot(players));
	});
	socket.on('playerLeft', (player: string) => {
		console.log(`user ${player} left`);
		players.delete(player);
		console.log($state.snapshot(players));
	});

	socket.on('playerNameChanged', ({ oldName, newName }: { oldName: string; newName: string }) => {
		console.log(`user ${oldName} changed name to ${newName}`);
		players.delete(oldName);
		players.add(newName);
		console.log($state.snapshot(players));
	});

	socket.on('changeScene', (scene, gameRole: string) => {
		console.log(`changing scene to ${scene} with role ${gameRole}`);
		role = gameRole;
		currentScene = scene;
	});

	socket.on('chooseCategory', (gameRole: string, wordCategories = []) => {
		console.log(`changing scene to chooseCategory with role ${gameRole}`);
		role = gameRole;
		categories = wordCategories;
		currentScene = 'chooseCategory';
	});
	socket.on('writeClues', (gameRole: string, word: string = '') => {
		console.log(`changing scene to writeClues with role ${gameRole}`, word);
		role = gameRole;
		secretWord = word;
		currentScene = 'writeClues';
	});
	socket.on(
		'filterClues',
		(gameRole: string, votesForDuplicate: Array<number> = [], writerClues: Array<string> = []) => {
			role = gameRole;
			clues = writerClues;
			votes = votesForDuplicate;
			currentScene = 'filterClues';
			socket.on('updateVotes', (index, vote: number) => {
				if (votes && votes.length > 0) {
					console.log('getting updated votes', index, vote);
					votes[index] += vote;
				}
			});
		}
	);
	socket.on(
		'guessWord',
		(gameRole: string, guesserClues: Array<string>, writerClues: Array<string> = []) => {
			socket.off('updateVotes');
			console.log(`changing scene to guessWord with role ${gameRole}`);
			console.log(`clues are`, guesserClues, writerClues);
			role = gameRole;
			clues = writerClues;
			dedupedClues = guesserClues;
			currentScene = 'guessWord';
		}
	);

	socket.on(
		'endGame',
		(gameState: {
			clues: Array<string>;
			dedupedClues: Array<string>;
			guess: string;
			secretWord: string;
			category: string;
			success: boolean;
			gamesWon: number;
			gamesPlayed: number;
			playerCount: number;
		}) => {
			try {
				console.log(`ending game`, gameState);
				clues = gameState.clues;
				dedupedClues = gameState.dedupedClues;
				guess = gameState.guess;
				secretWord = gameState.secretWord;
				category = gameState.category;
				currentScene = 'endGame';
				wordGuessed = gameState.success;
				gamesWon = gameState.gamesWon;
				gamesPlayed = gameState.gamesPlayed;
				totalRounds = gameState.playerCount;
			} catch (error) {
				console.log('errored on end game', error);
			}
		}
	);

	//////// FUNCTIONS
	const handleChangeName = async (newName: string): Promise<boolean> => {
		isChangingName = true;
		try {
			const success = await new Promise<boolean>((resolve) => {
				socket.emit('changeName', username, newName, roomName, (response: { status: string }) => {
					if (response) {
						resolve(response.status === 'ok');
					}
					resolve(false);
				});
			});

			if (success) {
				setUsername(newName);
				return true;
			}
			return false;
		} finally {
			isChangingName = false;
		}
	};

	const openChangeNameModal = () => {
		showChangeNameModal = true;
	};

	// submit event to server and proceed to next scene
	const submitAnswer = (input: string) => {
		if (currentScene === 'chooseCategory') {
			socket.emit('chooseCategory', input);

			console.log(`submitted ${input} for`, currentScene);
		} else if (currentScene === 'writeClues') {
			socket.emit('submitClue', input);

			console.log(`submitted ${input} for`, currentScene);
		} else if (currentScene === 'filterClues') {
			socket.emit('finishVoting');

			console.log(`submitted ${input} for`, currentScene);
		} else if (currentScene === 'guessWord') {
			socket.emit('guessWord', input);

			console.log(`submitted ${input} for`, currentScene);
		}
		categories = [];
	};

	const openLeaveRoomModal = () => {
		showLeaveRoomModal = true;
	};

	const handleLeaveRoom = () => {
		socket.disconnect();
		leaveRoom();
	};

	const startGame = async () => {
		console.log('starting the game!@!!!!!!!!!!!!!');
		console.log('players are', players);
		if (players.size < 3) {
			alert('must have at least 3 players to play!');
		} else {
			console.log('we got enough players nice');
			try {
				await new Promise<boolean>((resolve) => {
					socket.emit('startGame', (response: { status: string; message?: string }) => {
						console.log('callback was', response);
						if (response.status === 'ok') {
							resolve(true);
						} else {
							console.error('Failed to start game:', response.message);
							alert(response.message || 'Failed to start game');
							resolve(false);
						}
					});
				});
			} catch (error) {
				console.error('Error starting game:', error);
				alert('Failed to start game');
			}
		}
	};

	const updateVotes = (index: number, value: number) => {
		socket.emit('updateVotes', index, value);
	};

	const nextRound = () => {
		socket.emit('nextRound');
	};

	// Handle server-side submission rejections
	socket.on('submissionRejected', (data) => {
		console.warn(`Submission rejected for ${data.phase}: ${data.reason}`);
		alert(`Submission rejected: ${data.reason}`);
	});

	export const add = (first: number) => {
		return first + 10;
	};
</script>

<div class="bg-background min-h-screen">
	<RoomHeader
		{roomName}
		{username}
		{currentScene}
		onChangeName={openChangeNameModal}
		onLeaveRoom={openLeaveRoomModal}
	/>

	<div class="container mx-auto max-w-4xl space-y-1 p-1">
		<PlayerList {players} currentUser={username} />
	</div>

	{#if currentScene == 'main'}
		<div class="container mx-auto max-w-4xl space-y-6 p-4">
			<GameInstructions />

			<div class="flex justify-center">
				<Button
					class="px-8 py-3 text-lg font-semibold"
					variant="default"
					onclick={startGame}
					disabled={players.size < 3}
				>
					{players.size < 3 ? `Need ${3 - players.size} more players` : 'Start Game'}
				</Button>
			</div>
		</div>
	{:else if currentScene == 'chooseCategory'}
		<div class="container mx-auto max-w-4xl p-4">
			<div class="mb-6 text-center">
				<p class="text-muted-foreground text-sm">
					My role is <span class="text-foreground font-medium">{role}</span>
				</p>
			</div>
			<ChooseCategory {categories} {role} {submitAnswer} />
		</div>
	{:else if currentScene == 'writeClues'}
		<div class="container mx-auto max-w-4xl p-4">
			<WriteClues word={secretWord} {role} {submitAnswer} />
		</div>
	{:else if currentScene == 'filterClues'}
		<div class="container mx-auto max-w-4xl p-4">
			<FilterClues
				bind:votes
				{clues}
				{secretWord}
				{role}
				{updateVotes}
				submitAnswer={() => submitAnswer('')}
			/>
		</div>
	{:else if currentScene == 'guessWord'}
		<div class="container mx-auto max-w-4xl p-4">
			<GuessWord {dedupedClues} {clues} {role} {submitAnswer} />
		</div>
	{:else if currentScene == 'endGame'}
		<div class="container mx-auto max-w-4xl p-4">
			<EndGame
				{category}
				{dedupedClues}
				{clues}
				{guess}
				{secretWord}
				{wordGuessed}
				{gamesPlayed}
				{gamesWon}
				{totalRounds}
				playAgain={nextRound}
			/>
		</div>
	{/if}
</div>

<!-- Modals -->
<ChangeNameModal
	bind:open={showChangeNameModal}
	currentName={username}
	onSubmit={handleChangeName}
	isSubmitting={isChangingName}
/>

<LeaveRoomModal bind:open={showLeaveRoomModal} {roomName} onConfirm={handleLeaveRoom} />
