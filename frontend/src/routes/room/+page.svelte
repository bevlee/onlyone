<!-- Room management page - handles room actions -->
<script lang="ts">
  let roomName = $state('Game Room');
  let username = $state('Player1');
  let players = $state(['Player1', 'Player2', 'Player3']);
  let isRoomLeader = $state(true);
  let gameStarted = $state(false);

  const startGame = () => {
    if (players.length < 3) {
      alert('Need at least 3 players to start!');
      return;
    }
    gameStarted = true;
    console.log('Starting game...');
  };

  const leaveRoom = () => {
    console.log('Leaving room...');
  };

  const kickPlayer = (player: string) => {
    console.log('Kicking player:', player);
  };
</script>

<div class="bg-background min-h-screen">
  <!-- Room Header -->
  <div class="border-b bg-card p-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">{roomName}</h2>
        <p class="text-sm text-muted-foreground">Playing as: {username}</p>
      </div>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          onclick={() => console.log('Change name')}
        >
          Change Name
        </button>
        <button
          class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2"
          onclick={leaveRoom}
        >
          Leave Room
        </button>
      </div>
    </div>
  </div>

  <div class="container mx-auto max-w-4xl space-y-1 p-1">
    <!-- Player List -->
    <div class="bg-card p-4 rounded-md border">
      <h3 class="text-lg font-semibold mb-3">Players ({players.length}/12)</h3>
      <div class="space-y-2">
        {#each players as player}
          <div class="flex items-center justify-between p-2 bg-muted rounded">
            <span class="font-medium">{player}</span>
            <div class="flex gap-2">
              {#if player === username}
                <span class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">You</span>
              {/if}
              {#if isRoomLeader && player !== username}
                <button
                  class="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 px-2 py-1 rounded"
                  onclick={() => kickPlayer(player)}
                >
                  Kick
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  {#if !gameStarted}
    <div class="container mx-auto max-w-4xl space-y-6 p-4">
      <!-- Game Instructions -->
      <div class="bg-card p-6 rounded-md border">
        <h3 class="text-lg font-semibold mb-3">How to Play</h3>
        <div class="space-y-2 text-sm text-muted-foreground">
          <p>1. One player will be the guesser, others will write clues</p>
          <p>2. Writers choose a difficulty and get a secret word</p>
          <p>3. Writers submit one-word clues to help the guesser</p>
          <p>4. Duplicate clues are removed by voting</p>
          <p>5. Guesser tries to guess the word from remaining clues</p>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          class="px-8 py-3 text-lg font-semibold inline-flex items-center justify-center whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90"
          onclick={startGame}
          disabled={players.length < 3}
        >
          {players.length < 3 ? `Need ${3 - players.length} more players` : 'Start Game'}
        </button>
      </div>
    </div>
  {:else}
    <div class="container mx-auto max-w-4xl p-4">
      <div class="bg-card p-6 rounded-md border text-center">
        <h3 class="text-lg font-semibold mb-3">Game Started!</h3>
        <p class="text-muted-foreground">Game interface will be implemented here</p>
      </div>
    </div>
  {/if}
</div>