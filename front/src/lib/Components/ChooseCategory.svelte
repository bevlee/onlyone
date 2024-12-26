<script>
    import Timer from "./Timer.svelte";
    const { categories, role, submitAnswer, leaveGame} = $props();
    let selectedOption = $state(categories[0])
</script>



{#if role=="guesser"}
    <Timer count=20 {submitAnswer}/>
    <div>
        <h2>Choose a category for your secret word</h2>
        {#each categories as category }
        <input type="radio" bind:group={selectedOption} id={category} value={category}>
            <label for={category}>{category}</label>
        
        {/each}
    </div>
    <button onclick={() => submitAnswer(selectedOption)}>Select</button>

{:else}


    <Timer count=5 {submitAnswer}/>
    <h2>Please wait... the guesser is choosing the category</h2>


{/if}


<!-- <button onclick={() => leaveGame()}>Leave Game</button> -->