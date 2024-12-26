<script>
    const { category, dedupedClues ,clues,  guess, secretWord, wordGuessed, playAgain } = $props();
    console.log(`ending game`, dedupedClues, clues, guess, category)

    let displayedClues = $state(dedupedClues);
    let hidden = false
    const hide = () => {
        hidden = !hidden;
        displayedClues = hidden ? clues : dedupedClues
    }
</script>



<div>
    <h2>The category was: {category}</h2>
    <h2>The clues were: </h2>
    {#each displayedClues as clue }
        <h3>{clue}</h3>
    {/each}
    <button onclick={hide}>Toggle redacted clues</button>


    <h2>Your guess was: {guess}</h2>
    <h2>The secret word was: {secretWord}</h2>

    {#if wordGuessed}

    <h2>YAy you got it</h2>
    {:else}
    <h2>You did not manage to guess the word :/</h2>
    {/if}

</div>
<button onclick={playAgain}>Play Again</button>

