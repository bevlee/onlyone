<script>
    import Timer from "./Timer.svelte";
    const { word, role, submitAnswer, leaveGame} = $props();
    let text = $state("")

</script>


{#if role=="guesser"}

    <h2>
        
        <Timer count=20 {submitAnswer}/>
        Everyone is busy writing prompts <em>{word}</em>
    </h2>


{:else}


    <Timer count=20 {submitAnswer}/>
    <h2>
        The Secret word is <em>{word}</em>
    </h2>

    <input type="text" maxlength="100" bind:value={text}/>

    <button onclick={() => submitAnswer(text)}>Submit</button>

{/if}

<!-- <button onclick={() => leaveGame()}>Leave Game</button> -->