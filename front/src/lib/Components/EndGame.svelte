<script>
    const { categories, leaveGame} = $props();
    let selectedOption = $state(categories[0])
</script>



    <div>
        <h2>Choose a category for your secret word</h2>
        {#each categories as category }
        <input type="radio" bind:group={selectedOption} id={category} value={category}>
            <label for={category}>{category}</label>
        
        {/each}
    </div>
    <button onclick={() => submitAnswer(selectedOption)}>Select</button>

