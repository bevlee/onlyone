<script>
    import Timer from "./Timer.svelte";
    import { defaultTimer } from "../config";
    const { clues, role, submitAnswer, leaveGame} = $props();
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
    let displayedClues = $state(updatedClues);
    let hidden = false
    const hide = () => {
        hidden = !hidden;
        displayedClues = hidden ? clues : updatedClues
    }
    const submit = () => {
        submitAnswer(text)
    }
</script>



{#if role=="guesser"}
    <Timer count={defaultTimer} submitAnswer={() => submit()}/>
    <h2>Your clues are: </h2>
    {#each displayedClues as clue }
    <h3>{clue}</h3>
    {/each}
    <input type="text" maxlength="100" bind:value={text}/>
    <button onclick={() => submitAnswer(text)}>Submit</button>


    {:else}
    
    <Timer count={defaultTimer} submitAnswer={() => {}}/>
    <h2>Your clues are: </h2>
    {#each displayedClues as clue }
    <h3>{clue}</h3>
    {/each}
    <button onclick={hide}>Toggle redacted clues</button>

{/if}
    <!-- <button onclick={() => leaveGame()}>Leave Game</button> -->