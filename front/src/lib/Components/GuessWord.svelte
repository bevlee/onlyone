<script>
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { defaultTimer } from "../config";
    import Timer from "./Timer.svelte";
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
    for (let i = 0; i < clues.length; i++) {
        for (let j = 0; j < clues.length; j++) {
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


<Timer count={defaultTimer} submitAnswer={() => submit()}/>
<h2>Your clues are: </h2>

{#each displayedClues as clue }
    <h3>{clue}</h3>
{/each}

{#if role=="guesser"}
    <Input class="max-w-xs content-center my-6" type="text" maxlength="100"  bind:value={text}/>
    <Button onclick={() => submitAnswer(text)}>Submit</Button>

    {:else}
    
    <Button onclick={hide}>Toggle redacted clues</Button>

{/if}
    <!-- <Button onclick={() => leaveGame()}>Leave Game</Button> -->