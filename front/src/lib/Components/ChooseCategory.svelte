<script>
    import Timer from "./Timer.svelte";
    import { defaultTimer } from "../config";
    const { categories, role, submitAnswer, leaveGame} = $props();
    let selectedOption = $state(categories[0])

    const submit = () => {
        submitAnswer(selectedOption)
    }
</script>



{#if role=="guesser"}
    <Timer count={defaultTimer} submitAnswer={() => submit()}/>
    <div>
        <h2>Choose a category for your secret word</h2>
        {#each categories as category }
        <input type="radio" bind:group={selectedOption} id={category} value={category}>
            <label for={category}>{category}</label>
        
        {/each}
    </div>
    <button onclick={() => submit()}>Select</button>

{:else}


    <Timer count=20 submitAnswer={()=>{}}/>
    <h2>Please wait... the guesser is choosing the category</h2>


{/if}


<!-- <button onclick={() => leaveGame()}>Leave Game</button> -->