<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { io } from 'socket.io-client';
	import { SvelteSet } from 'svelte/reactivity';
	import ChooseCategory from '$lib/components/ChooseCategory.svelte';
	import EndGame from '$lib/components/EndGame.svelte';
	import FilterClues from '$lib/components/FilterClues.svelte';
	import GuessWord from '$lib/components/GuessWord.svelte';
	import WriteClues from '$lib/components/WriteClues.svelte';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	let { roomName, leaveRoom } = $props();
	console.log('Room name in child:', roomName);
	let gameStarted = $state<boolean>(false);
	let username = $state<string | null>(localStorage.getItem('username'));

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
	let timer: Number = 20;
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

	if (!username) {
		username = 'user' + Math.floor(Math.random() * 10000);
		setUsername(username);
	}
	let currentScene = $state<string>('main');
	let players = $state(new SvelteSet([username]));

	function setUsername(newUsername: string) {
		localStorage.setItem('username', newUsername);
		username = newUsername;
	}

	// init socket
	const socket = io(env.PUBLIC_SOCKET_ENDPOINT, {
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
		if (currentScene === 'main') {
			gameStarted = false;
		}
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
	const changeName = async (newName: string) => {
		const success = await new Promise((resolve) => {
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
	};

	console.log('roomname is', roomName);
	const changeNamePrompt = async () => {
		console.log('changing name');
		let newName: string | null = prompt('Please enter your username', username);
		if (newName) {
			if (newName.length > 0 && newName.length < 30 && newName != username) {
				const nameChangeSuccess = await changeName(newName);
				if (!nameChangeSuccess) {
					alert('Error: There is already a player in the room with the name: ');
					await changeNamePrompt();
				}
			} else {
				alert('Name must be between 1 and 30 chars and unique. Try again!');
			}
		}
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
		timer = 20;
		categories = [];
	};

	const leave = () => {
		socket.disconnect();
		leaveRoom();
	};

	const startGame = async () => {
		console.log('starting the game!@!!!!!!!!!!!!!');
		console.log('players are', players);
		if (players.size < 1) {
			alert('must have at least 3 players to play!');
		} else {
			console.log('we got enough players nice');
			socket.emit('startGame', (response: { status: string }) => {
				console.log('callback was', response);
			});
			gameStarted = true;
		}
	};
	const leaveGame = async () => {
		console.log('stopping game');
		socket.emit('stopGame', roomName);
		currentScene = 'main';
	};

	const updateVotes = (index: number, value: number) => {
		socket.emit('updateVotes', index, value);
	};

	export const add = (first: number) => {
		return first + 10;
	};
</script>

<div class="space-y-6 p-6">
	<div class="flex justify-end">
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="outline" size="icon">
					<SettingsIcon class="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{#if currentScene === 'main' || currentScene === 'endGame'}
					<DropdownMenuItem onclick={changeNamePrompt}>
						<UserIcon class="mr-2 h-4 w-4" />
						Change Name
					</DropdownMenuItem>
					<DropdownMenuSeparator />
				{/if}
				<DropdownMenuItem onclick={() => leave()}>
					<LogOutIcon class="mr-2 h-4 w-4" />
					Leave Room
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	<div class="space-y-4 text-center">
		<div class="space-y-2">
			<h2 class="text-xl font-semibold">
				Room: <span class="text-primary">{roomName}</span>
			</h2>
			<p class="text-lg">
				Username: <strong>{username}</strong>
			</p>
		</div>

	</div>

	<div class="space-y-3">
		<h3 class="text-center text-lg font-medium">Players in Lobby</h3>
		<ul class="space-y-1 rounded-lg border bg-muted/20 p-4">
			{#each players.keys() as player}
				<li class="text-center">{player}</li>
			{/each}
		</ul>
	</div>

	{#if currentScene == 'main'}
		<div class="space-y-6">
			<div class="space-y-4 rounded-lg border bg-muted/20 p-6">
				<h3 class="text-center text-lg font-medium">How to play</h3>
				<ol class="space-y-2 list-inside list-decimal text-left">
					<li>Guesser picks a category</li>
					<li>Others see the word, give one-word clues</li>
					<li>No duplicate clues allowed!</li>
				</ol>
				<p class="text-center font-medium">
					Goal: Guess as many words as possible together!
				</p>
			</div>
			<div class="pt-4">
				<Button class="w-full" variant="default" onclick={startGame}>Start Game</Button>
			</div>
		</div>
	{:else if currentScene == 'chooseCategory'}
		<div class="text-center">
			<p class="mb-4 text-sm text-muted-foreground">My role is {role}</p>
		</div>
		<ChooseCategory {categories} {role} {submitAnswer} {leaveGame} />
	{:else if currentScene == 'writeClues'}
		<WriteClues word={secretWord} {role} {submitAnswer} {leaveGame} />
	{:else if currentScene == 'filterClues'}
		<FilterClues bind:votes {clues} {role} {updateVotes} {submitAnswer} {leaveGame} />
	{:else if currentScene == 'guessWord'}
		<GuessWord {dedupedClues} {clues} {role} {submitAnswer} {leaveGame} />
	{:else if currentScene == 'endGame'}
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
			playAgain={startGame}
		/>
	{/if}
</div>
