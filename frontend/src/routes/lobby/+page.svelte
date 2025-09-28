<!-- Lobby page - displays active rooms and allows joining -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import { Input } from '$lib/components/ui/input/index.js';

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
    <Input bind:value={roomName} class="max-w-xs content-center" placeholder="Room name" />
    <Button class="mt-6 bg-green-700 text-white hover:bg-green-800" type="submit">Join</Button>
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