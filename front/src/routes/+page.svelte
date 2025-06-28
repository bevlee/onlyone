<script lang=ts>
    import RoomSelection from "$lib/Components/Homepage.svelte";
    import Room from "$lib/Components/Room.svelte";
  

    let isMobileDevice = window.screen.width < 768;
    let maxWidth = window.screen.width - 100;
    console.log(maxWidth)

    let roomName: string = $state("");
    let roomSelected: boolean = $state(false);
    
    const joinRoom = (name: string) => {
        console.log("joining ", name)
        roomSelected = true;
        roomName = name
    }
    const leaveRoom = () => {
        console.log("leaving room ")
        roomSelected = false;
        roomName = ""
    }
  </script>
  <h1 class="my-12  scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-center">
    Only One
  </h1>    
  {#if isMobileDevice}

  <div class="aspect-[4/3] w-5/6 mx-auto m-6 bg-emerald-400">
    <!-- Mobile-optimized content -->
    <p>hello lorem ipsum la da dee toaih  as f ahofa sia as assdf khlnaf</p>

    {#if !roomSelected}
    <RoomSelection 
        {joinRoom}
        />
        {:else}
    <Room
    {roomName}
    {leaveRoom}
    />
    {/if}
  </div>
    {:else}
    <!-- Desktop content -->
    <div class="aspect-[4/3] w-5/6 mx-auto bg-yellow-400 overflow:hidden;">
        <p>hello lorem ipsum la da dee toaih gqhwoirhoiasdfkhlnaf</p>
        
        {#if !roomSelected}
        <RoomSelection 
            {joinRoom}
            />
            {:else}
        <Room
        {roomName}
        {leaveRoom}
        />
        {/if}
    </div>
    {/if}
  
  <style>
    /* body { margin: 0; padding-bottom: 3rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  
    #form { background: rgba(0, 0, 0, 0.15); padding: 0.25rem; position: fixed; bottom: 0; left: 0; right: 0; display: flex; height: 3rem; box-sizing: border-box; backdrop-filter: blur(10px); }
    #input { border: none; padding: 0 1rem; flex-grow: 1; border-radius: 2rem; margin: 0.25rem; }
    #input:focus { outline: none; }
    #form > button { background: #333; border: none; padding: 0 1rem; margin: 0.25rem; border-radius: 3px; outline: none; color: #fff; }
  
    #messages { list-style-type: none; margin: 0; padding: 0; }
    #messages > li { padding: 0.5rem 1rem; }
    #messages > li:nth-child(odd) { background: #efefef; }
    em {
      font-weight: bold;
    } */
  </style>