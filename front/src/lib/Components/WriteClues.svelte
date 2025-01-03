<script>
    import Timer from "./Timer.svelte";
    const { word, role, submitAnswer, leaveGame} = $props();
    let text = $state("")
    let submitted = $state(false)


    // clue must be one word!
    let invalid = $derived(text.includes(" "))

    const submit = (text) => {
        if (text === word) {
            alert("you cannot write the secret as a clue!")
            
        }
        else {
            submitted = true;
            submitAnswer(text)
        }
    }
</script>


{#if role=="guesser"}

    <h2>
        
        <Timer count=20 submitAnswer={()=>{}}/>
        Everyone is busy writing prompts <em>{word}</em>
    </h2>


{:else}


    <Timer count=20 {submitAnswer}/>
    <h2>
        The Secret word is <em>{word}</em>
    </h2>
    <h2>Please write a ONE WORD clue</h2>
    <input type="text" maxlength="100" bind:value={text}/>

    <button disabled={submitted || invalid} onclick={() => submit(text)}>{submitted? "Answer submitted" : "Submit"}</button>
    {#if invalid}
    <p class="warning">Your clue must be one word!!!</p>
    {/if}
{/if}

<!-- <button onclick={() => leaveGame()}>Leave Game</button> -->