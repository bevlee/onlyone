<!-- Lobby page - displays active rooms and allows joining -->
<script lang="ts">
  let roomName = $state('testRoom');

  const joinRoom = (e: Event) => {
    e.preventDefault();
    // Join room logic will go here
    console.log('Joining room:', roomName);
  };
</script>

<div class="flex flex-col items-center justify-center">
  <p class="my-6 leading-7">Please enter the room you want to join:</p>

  <form class="m-6 text-center" onsubmit={joinRoom}>
    <input
      bind:value={roomName}
      class="max-w-xs content-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      placeholder="Room name"
    />
    <button
      class="mt-6 bg-green-700 text-white hover:bg-green-800 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2"
      type="submit"
    >
      Join
    </button>
  </form>

  <!-- Active rooms list -->
  <div class="w-full max-w-xs mt-8">
    <h2 class="text-lg font-semibold mb-4 text-center">Active Rooms</h2>
    <div class="space-y-2">
      <!-- Room list will be populated here -->
      <div class="p-3 border rounded-md bg-card text-card-foreground">
        <div class="flex justify-between items-center">
          <span class="font-medium">Room 1</span>
          <span class="text-sm text-muted-foreground">3/12 players</span>
        </div>
      </div>
      <div class="p-3 border rounded-md bg-card text-card-foreground">
        <div class="flex justify-between items-center">
          <span class="font-medium">Room 2</span>
          <span class="text-sm text-muted-foreground">1/12 players</span>
        </div>
      </div>
    </div>
  </div>
</div>