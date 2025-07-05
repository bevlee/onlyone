<script>
    let playerSocket = $state({});
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    const { joinRoom } = $props();
    let roomName = $state("testRoom");
    const submit = (e) => {
        e.preventDefault()
        joinRoom(roomName);
    }
</script>

<!-- <div class="w-m ">
    <AspectRatio ratio={16 / 9} class="bg-muted">
    </AspectRatio>
  </div> -->
<div class="flex flex-col items-center justify-center"> 

    <p class="leading-7 my-6"> Please enter the room you want to join:</p>

    <form class="text-center m-6" onsubmit={submit}>
        <Input bind:value={roomName} class="max-w-xs content-center"/>
        <Button  class="mt-6 bg-green-700 text-white hover:bg-green-800"  type="submit">Join</Button>
    </form>
</div>