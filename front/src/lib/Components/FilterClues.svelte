<script>
    import Timer from "./Timer.svelte";
    import _ from "lodash"
    const { votes=$bindable(), clues=[], role, updateVotes, submitAnswer, leaveGame} = $props();

    let submitted = $state(false)
    let userVotes = $state(new Array(votes.length).fill(0));
    
    
    const voteOnClue = (index, value) => {
        console.log(index, value)
        userVotes[index] += value;

        votes[index] += value
        updateVotes(index, value)
    }
    const hasVoted = (index, value) => {
        return userVotes[index] === value
    }
    
</script>


{#if role=="guesser"}

    <h2>
        
        <Timer count=20 submitAnswer={()=>{}}/>
        Removing duplicate clues... 
    </h2>


{:else}

    <Timer count=20 {submitAnswer}/>
    
    {#each clues as clue, index }
        <div>
        {#if votes[index] < 0}
            {clue} is sus with {votes[index]} votes 
        {:else}
            {clue} is good with {votes[index]} votes
        {/if}
        <button disabled={hasVoted(index, -1)} onclick={() => voteOnClue(index, -1)}>-</button> 
        <button disabled={hasVoted(index, 1)} onclick={() => voteOnClue(index, 1)}>+</button> 
       </div>
    {/each}

    
<br/>
<br/>
<br/>
<br/>
    <button disabled={submitted} onclick={() => submitAnswer()}> {submitted? "Votes submitted" : "Looks good to me!"}</button>

{/if}

<!-- <button onclick={() => leaveGame()}>Leave Game</button> -->