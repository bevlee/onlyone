<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import { io } from 'socket.io-client';
	import type { Player } from '$lib/player';
	import SubmitWords from '$lib/components/SubmitWords.svelte';
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
	import { emptyRepeatVotes, type RepeatVoteState } from '$lib/repeatVotes';

	interface RoomProps {
		roomName: string;
		leaveRoom: () => void;
	}

	let { roomName, leaveRoom }: RoomProps = $props();

	// Initialize username properly
	const initialUsername: string =
		localStorage.getItem('username') || 'user' + Math.floor(Math.random() * 10000);

	let username: string = $state<string>(initialUsername);
	let playerId = $state('');
	let players = $state<Player[]>([]);
	const resumeToken = sessionStorage.getItem('playerResumeToken') || crypto.randomUUID();
	sessionStorage.setItem('playerResumeToken', resumeToken);

	// Modal states
	let showChangeNameModal: boolean = $state(false);
	let showLeaveRoomModal: boolean = $state(false);
	let isChangingName: boolean = $state(false);

	// These need $state because they're mutated in callbacks/socket events
	let role: string = $state('');
	let repeatVotes: RepeatVoteState = $state(emptyRepeatVotes);
	let currentGuesserId = $state('');
	const currentGuesser = $derived(
		players.find((player) => player.playerId === currentGuesserId)?.username || 'A player who left'
	);

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
	interface PhaseTiming {
		phaseId: string;
		deadlineAt: number;
		serverNow: number;
	}
	let phaseId = '';
	let deadlineAt = $state(0);
	function receiveTiming(timing: PhaseTiming) {
		phaseId = timing.phaseId;
		deadlineAt = Date.now() + Math.max(0, timing.deadlineAt - timing.serverNow);
	}
	let mode = $state('classic');
	let submitted = $state(0);
	let submissionTotal = $state(0);
	let submittedByIds = $state<string[]>([]);
	const submittedBy = $derived(
		submittedByIds.map(
			(id) => players.find((player) => player.playerId === id)?.username || 'a former player'
		)
	);
	let poolRemaining = $state(0);
	let poolFinished = $state(false);
	let notice = $state('');
	let currentScene = $state<string>('main');

	function setUsername(newUsername: string): void {
		localStorage.setItem('username', newUsername);
		username = newUsername;
	}

	// use the local gameserver url in dev, otherwise use the proper domain name
	const backendUrl = env.PUBLIC_DEV_GAMESERVER_PORT
		? 'http://localhost:3000'
		: window.location.origin;

	const socket = io(backendUrl, {
		auth: (callback) => callback({ username, room: roomName, resumeToken })
	});

	socket.on('playerIdentity', (id: string) => {
		playerId = id;
	});
	socket.on('roomPlayers', (roster: Player[]) => {
		players = roster;
		const currentPlayer = roster.find((player) => player.playerId === playerId);
		if (currentPlayer) setUsername(currentPlayer.username);
	});

	socket.on('changeScene', (scene, gameRole: string) => {
		role = gameRole;
		currentScene = scene;
	});

	socket.on(
		'submitWords',
		(progress: { submitted: number; total: number }, timing: PhaseTiming) => {
			receiveTiming(timing);
			mode = 'yourWords';
			role = '';
			currentGuesserId = '';
			submitted = progress.submitted;
			submissionTotal = progress.total;
			currentScene = 'submitWords';
		}
	);
	socket.on('wordSubmissionProgress', (progress: { submitted: number; total: number }) => {
		submitted = progress.submitted;
		submissionTotal = progress.total;
	});
	socket.on('gameNotice', (message: string) => {
		notice = message;
	});

	socket.on(
		'chooseDifficulty',
		(gameRole: string, wordDifficulties = [], guesser = '', timing: PhaseTiming) => {
			receiveTiming(timing);
			role = gameRole;
			difficulties = wordDifficulties;
			currentGuesserId = guesser;
			currentScene = 'chooseDifficulty';
		}
	);
	socket.on(
		'writeClues',
		(gameRole: string, word: string = '', guesser = '', timing: PhaseTiming) => {
			receiveTiming(timing);
			role = gameRole;
			secretWord = word;
			currentGuesserId = guesser;
			currentScene = 'writeClues';
		}
	);
	socket.on(
		'filterClues',
		(
			gameRole: string,
			voteState: RepeatVoteState | null,
			writerClues: Array<string> = [],
			guesser = '',
			timing: PhaseTiming
		) => {
			receiveTiming(timing);
			role = gameRole;
			clues = writerClues;
			repeatVotes = voteState ?? emptyRepeatVotes;
			currentGuesserId = guesser;
			currentScene = 'filterClues';
		}
	);
	socket.on(
		'guessWord',
		(
			gameRole: string,
			guesserClues: Array<string>,
			writerClues: Array<string> = [],
			guesser = '',
			timing: PhaseTiming
		) => {
			receiveTiming(timing);
			role = gameRole;
			clues = writerClues;
			dedupedClues = guesserClues;
			currentGuesserId = guesser;
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
			currentGuesserId: string;
			mode?: string;
			submittedByIds?: string[];
			poolRemaining?: number;
			poolFinished?: boolean;
		}) => {
			try {
				clues = gameState.clues;
				dedupedClues = gameState.dedupedClues;
				guess = gameState.guess;
				secretWord = gameState.secretWord;
				difficulty = gameState.difficulty;
				mode = gameState.mode || 'classic';
				submittedByIds = gameState.submittedByIds || [];
				poolRemaining = gameState.poolRemaining || 0;
				poolFinished = gameState.poolFinished || false;
				currentScene = 'endGame';
				wordGuessed = gameState.success;
				gamesWon = gameState.gamesWon;
				gamesPlayed = gameState.gamesPlayed;
				totalRounds = gameState.playerCount;
				currentGuesserId = gameState.currentGuesserId;
			} catch (error) {}
		}
	);

	//////// FUNCTIONS
	const handleChangeName = async (newName: string): Promise<boolean> => {
		isChangingName = true;
		try {
			const success = await new Promise<boolean>((resolve) => {
				socket.emit('changeName', newName, (response: { status: string; username?: string }) => {
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
			socket.emit('chooseDifficulty', input, phaseId);
		} else if (currentScene === 'writeClues') {
			socket.emit('submitClue', input, phaseId);
		} else if (currentScene === 'filterClues') {
			socket.emit('finishVoting', phaseId);
		} else if (currentScene === 'guessWord') {
			socket.emit('guessWord', input, phaseId);
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
		if (players.length < 3) {
			alert('must have at least 3 players to play!');
		} else {
			try {
				await new Promise<boolean>((resolve) => {
					notice = '';
					socket.emit('startGame', { mode }, (response: { status: string; message?: string }) => {
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

	socket.on('repeatVotes', (voteState: RepeatVoteState) => {
		repeatVotes = voteState;
	});

	const markRepeated = (index: number, marked: boolean) => {
		socket.emit('markRepeated', index, marked, phaseId);
	};

	const submitWords = (words: string[]): Promise<{ success: boolean; reason?: string }> =>
		new Promise((resolve, reject) => {
			socket
				.timeout(10000)
				.emit(
					'submitWords',
					words,
					phaseId,
					(error: Error | null, response: { success: boolean; reason?: string }) => {
						if (error) reject(error);
						else resolve(response);
					}
				);
		});

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
		<PlayerList {players} currentPlayerId={playerId} />
	</div>

	{#if currentScene == 'main'}
		<div class="container mx-auto max-w-4xl space-y-6 p-4">
			<GameInstructions />
			{#if notice}<p role="status" class="text-center text-sm">{notice}</p>{/if}
			<fieldset class="bg-card space-y-3 rounded-lg border p-4">
				<legend class="px-1 font-medium">Game mode</legend>
				<label class="flex cursor-pointer items-start gap-3">
					<input type="radio" bind:group={mode} value="classic" class="mt-1" />
					<span
						><span class="font-medium">Classic</span><br />
						<span class="text-muted-foreground text-sm"
							>Use the game's words. The guesser chooses a difficulty each turn.</span
						></span
					>
				</label>
				<label class="flex cursor-pointer items-start gap-3">
					<input type="radio" bind:group={mode} value="yourWords" class="mt-1" />
					<span
						><span class="font-medium">Your words</span><br />
						<span class="text-muted-foreground text-sm"
							>Everyone secretly adds answers before play. Bring your shared references and
							in-jokes.</span
						></span
					>
				</label>
			</fieldset>

			<div class="flex justify-center">
				<Button
					class="px-8 py-3 text-lg font-semibold"
					variant="default"
					onclick={startGame}
					disabled={players.length < 3}
				>
					{players.length < 3 ? `Need ${3 - players.length} more players` : 'Start Game'}
				</Button>
			</div>
		</div>
	{:else}
		<div class="container mx-auto max-w-4xl p-4">
			{#if currentScene != 'endGame' && currentScene != 'submitWords'}
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
			{#if currentScene == 'submitWords'}
				<SubmitWords {deadlineAt} {submitted} total={submissionTotal} onSubmit={submitWords} />
			{:else if currentScene == 'chooseDifficulty'}
				<ChooseDifficulty {deadlineAt} {difficulties} {role} {submitAnswer} />
			{:else if currentScene == 'writeClues'}
				<WriteClues {deadlineAt} word={secretWord} {role} {submitAnswer} {currentGuesser} />
			{:else if currentScene == 'filterClues'}
				<FilterClues
					{deadlineAt}
					{repeatVotes}
					{clues}
					{secretWord}
					{role}
					{currentGuesser}
					{markRepeated}
					submitAnswer={() => submitAnswer('')}
				/>
			{:else if currentScene == 'guessWord'}
				<GuessWord {deadlineAt} {dedupedClues} {clues} {role} {submitAnswer} {currentGuesser} />
			{:else if currentScene == 'endGame'}
				<EndGame
					{difficulty}
					{mode}
					{submittedBy}
					{poolRemaining}
					{poolFinished}
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
