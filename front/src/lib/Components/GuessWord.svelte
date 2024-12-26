<script>
    import Timer from "./Timer.svelte";
    const { dedupedClues, clues, role, submitAnswer, leaveGame} = $props();
    const sameWord = (wordA, wordB) => {
        let stemmedA = getStem(wordA)
        let stemmedB = getStem(wordB)
        return stemmedA == stemmedB;
    }

    const getStem = (word) => {
        return word.trim().toLowerCase();
    }

    let text = $state("")
    let updatedClues = clues.slice()
    for (let i =0;i<clues.length;i++) {
        for (let j =0;j<clues.length;j++) {
            if (i != j) {
                if (sameWord(clues[i], clues[j])) {
                    updatedClues[i] = "<redacted>"
                    updatedClues[j] = "<redacted>"
                }
            }
        }
    }
    let displayedClues = $state(dedupedClues);
    let hidden = false
    const hide = () => {
        hidden = !hidden;
        displayedClues = hidden ? clues : dedupedClues
    }
</script>

{#if role=="guesser"}
    <Timer count=20 {submitAnswer}/>
    <h2>Guess the word!</h2>
    <h3>Your clues are: </h3>
    {#each dedupedClues as clue }
    <h3>{clue}</h3>
    {/each}
    <input type="text" maxlength="100" bind:value={text}/>
    <button onclick={() => submitAnswer(text)}>Submit</button>

{:else}
    
    <Timer count=20 submitAnswer={()=>{}}/>
    <h3>Your clues are: </h3>
    {#each displayedClues as clue }
    <h3>{clue}</h3>
    {/each}
    <button onclick={hide}>Toggle duplicate clues</button>

{/if}
    <!-- <button onclick={() => leaveGame()}>Leave Game</button> -->