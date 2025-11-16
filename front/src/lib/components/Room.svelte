<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { io } from 'socket.io-client';
	import { SvelteSet } from 'svelte/reactivity';
	import ChooseDifficulty from '$lib/components/ChooseDifficulty.svelte';
	import EndGame from '$lib/components/EndGame.svelte';
	import FilterClues from '$lib/components/FilterClues.svelte';
	import GuessWord from '$lib/components/GuessWord.svelte';
	import WriteClues from '$lib/components/WriteClues.svelte';
	import RoomHeader from '$lib/components/RoomHeader.svelte';
	import PlayerList from '$lib/components/PlayerList.svelte';
	import GameInstructions from '$lib/components/GameInstructions.svelte';
	import ChangeNameModal from '$lib/components/ChangeNameModal.svelte';
	import LeaveRoomModal from '$lib/components/LeaveRoomModal.svelte';

	interface RoomProps {
		roomName: string;
		leaveRoom: () => void;
	}

	let { roomName, leaveRoom }: RoomProps = $props();

	// Initialize username properly
	const initialUsername: string =
		localStorage.getItem('username') || 'user' + Math.floor(Math.random() * 10000);

	let username: string = $state<string>(initialUsername);

	// Modal states
	let showChangeNameModal: boolean = $state(false);
	let showLeaveRoomModal: boolean = $state(false);
	let isChangingName: boolean = $state(false);

	// These need $state because they're mutated in callbacks/socket events
	let role: string = $state('');
	let votes: Array<number> = $state<Array<number>>([]);
	let currentGuesser: string = $state('');

	let difficulties: Array<string> = $state(['a', 'b', 'c']);
	let difficulty: string = $state('');
	let clues: Array<string> = $state(['a', 'b', 'a']);
	let dedupedClues: Array<string> = $state([]);
	let secretWord: string = $state('secretWord');
	let guess: string = $state('');
	let wordGuessed: boolean = $state(false);
	let gamesWon: number = $state(0);
	let gamesPlayed: number = $state(0);
	let totalRounds: number = $state(0);

	// Set initial username if not already saved
	if (initialUsername.startsWith('user')) {
		setUsername(initialUsername);
	}
	let currentScene = $state<string>('main');
	let players = $derived(new SvelteSet([username]));

	function setUsername(newUsername: string): void {
		localStorage.setItem('username', newUsername);
		username = newUsername;
	}

	// use the local gameserver url in dev, otherwise use the proper domain name
	const backendUrl = env.PUBLIC_DEV_GAMESERVER_PORT
		? 'http://localhost:3000'
		: window.location.origin;

	// init socket
	const socket = io(backendUrl, {
		auth: {
			serverOffset: 0,
			username: username,
			room: roomName
		}
	});

	socket.on('disconnect', () => {
		//send the username to the server
	});
	socket.on('connect', () => {});
	socket.on('joinRoom', (roomDetails: Object) => {
		for (let player of Object.keys(roomDetails)) {
			players.add(player);
		}
	});

	socket.on('playerJoined', (player: string) => {
		players.add(player);
	});
	socket.on('playerLeft', (player: string) => {
		players.delete(player);
	});

	socket.on('playerNameChanged', ({ oldName, newName }: { oldName: string; newName: string }) => {
		players.delete(oldName);
		players.add(newName);
	});

	socket.on('changeScene', (scene, gameRole: string) => {
		role = gameRole;
		currentScene = scene;
	});

	socket.on('chooseDifficulty', (gameRole: string, wordDifficulties = [], guesser = '') => {
		role = gameRole;
		difficulties = wordDifficulties;
		currentGuesser = guesser;
		currentScene = 'chooseDifficulty';
	});
	socket.on('writeClues', (gameRole: string, word: string = '', guesser = '') => {
		role = gameRole;
		secretWord = word;
		currentGuesser = guesser;
		currentScene = 'writeClues';
	});
	socket.on(
		'filterClues',
		(
			gameRole: string,
			votesForDuplicate: Array<number> = [],
			writerClues: Array<string> = [],
			guesser = ''
		) => {
			role = gameRole;
			clues = writerClues;
			votes = votesForDuplicate;
			currentGuesser = guesser;
			currentScene = 'filterClues';
			socket.on('updateVotes', (index, vote: number) => {
				if (votes && votes.length > 0) {
					votes[index] += vote;
				}
			});
		}
	);
	socket.on(
		'guessWord',
		(
			gameRole: string,
			guesserClues: Array<string>,
			writerClues: Array<string> = [],
			guesser = ''
		) => {
			socket.off('updateVotes');
			role = gameRole;
			clues = writerClues;
			dedupedClues = guesserClues;
			currentGuesser = guesser;
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
			difficulty: string;
			success: boolean;
			gamesWon: number;
			gamesPlayed: number;
			playerCount: number;
			currentGuesser: string;
		}) => {
			try {
				clues = gameState.clues;
				dedupedClues = gameState.dedupedClues;
				guess = gameState.guess;
				secretWord = gameState.secretWord;
				difficulty = gameState.difficulty;
				currentScene = 'endGame';
				wordGuessed = gameState.success;
				gamesWon = gameState.gamesWon;
				gamesPlayed = gameState.gamesPlayed;
				totalRounds = gameState.playerCount;
				currentGuesser = gameState.currentGuesser;
			} catch (error) {}
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
		if (currentScene === 'chooseDifficulty') {
			socket.emit('chooseDifficulty', input);
		} else if (currentScene === 'writeClues') {
			socket.emit('submitClue', input);
		} else if (currentScene === 'filterClues') {
			socket.emit('finishVoting');
		} else if (currentScene === 'guessWord') {
			socket.emit('guessWord', input);
		}
		difficulties = [];
	};

	const openLeaveRoomModal = () => {
		showLeaveRoomModal = true;
	};

	const handleLeaveRoom = () => {
		socket.disconnect();
		leaveRoom();
	};

	const startGame = async () => {
		if (players.size < 3) {
			alert('must have at least 3 players to play!');
		} else {
			try {
				await new Promise<boolean>((resolve) => {
					socket.emit('startGame', (response: { status: string; message?: string }) => {
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
	{:else}
		<div class="container mx-auto max-w-4xl p-4">
			{#if currentScene != 'endGame'}
				<div class="mb-6 text-center">
					{#if role !== 'guesser'}
						<p class="text-muted-foreground mt-1 text-sm">
							Current guesser: <span class="text-foreground font-medium">{currentGuesser}</span>
						</p>
					{/if}

					<p class="text-muted-foreground text-sm">
						My role is <span class="text-foreground font-medium">{role}</span>
					</p>
				</div>
			{/if}
			{#if currentScene == 'chooseDifficulty'}
				<ChooseDifficulty {difficulties} {role} {submitAnswer} />
			{:else if currentScene == 'writeClues'}
				<WriteClues word={secretWord} {role} {submitAnswer} {currentGuesser} />
			{:else if currentScene == 'filterClues'}
				<FilterClues
					bind:votes
					{clues}
					{secretWord}
					{role}
					{updateVotes}
					submitAnswer={() => submitAnswer('')}
				/>
			{:else if currentScene == 'guessWord'}
				<GuessWord {dedupedClues} {clues} {role} {submitAnswer} {currentGuesser} />
			{:else if currentScene == 'endGame'}
				<EndGame
					{difficulty}
					{dedupedClues}
					{clues}
					{guess}
					{secretWord}
					{wordGuessed}
					{gamesPlayed}
					{gamesWon}
					playAgain={nextRound}
					{currentGuesser}
				/>
			{/if}
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
