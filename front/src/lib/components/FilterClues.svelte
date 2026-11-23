<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { defaultTimer } from '$lib/config';
	import Timer from '$lib/components/Timer.svelte';
	import type { RepeatVoteState } from '$lib/repeatVotes';

	type Props = {
		repeatVotes: RepeatVoteState;
		clues: string[];
		secretWord: string;
		role: string;
		currentGuesser: string;
		deadlineAt: number;
		markRepeated: (index: number, marked: boolean) => void;
		submitAnswer: () => void;
	};

	const {
		repeatVotes,
		clues = [],
		secretWord,
		role,
		currentGuesser,
		deadlineAt,
		markRepeated,
		submitAnswer
	}: Props = $props();

	const NO_ANSWER = '<no answer>';

	let submitted = $state(false);
	let myMarks = $state<boolean[]>([]);

	const isRepeated = (index: number): boolean =>
		repeatVotes.autoRemoved[index] || (repeatVotes.counts[index] ?? 0) >= repeatVotes.required;

	const shownCount = $derived(clues.filter((_, index) => !isRepeated(index)).length);

	const toggleMark = (index: number): void => {
		if (submitted || repeatVotes.autoRemoved[index]) return;
		myMarks[index] = !myMarks[index];
		markRepeated(index, myMarks[index]);
	};

	const submit = (): void => {
		if (submitted || role === 'guesser') return;
		submitted = true;
		submitAnswer();
	};

	const voteNote = (index: number): string => {
		const votes = repeatVotes.counts[index] ?? 0;
		if (votes === 0) return 'No votes';
		return `${votes} ${votes === 1 ? 'vote' : 'votes'}`;
	};

	const isOneShort = (index: number): boolean =>
		!isRepeated(index) && repeatVotes.required - (repeatVotes.counts[index] ?? 0) === 1;

	const autoReason = (clue: string): string =>
		clue === NO_ANSWER || !clue.trim() ? 'No clue given' : 'Identical to another clue';

	const displayClue = (clue: string): string =>
		clue === NO_ANSWER || !clue.trim() ? '(no clue)' : clue;

	const pluralClues = (count: number): string => `${count} ${count === 1 ? 'clue' : 'clues'}`;
</script>

<div class="space-y-6">
	{#if role == 'guesser'}
		<div class="space-y-4 text-center">
			<Timer {deadlineAt} count={defaultTimer} submitAnswer={() => {}} />
			<h2 class="text-muted-foreground text-lg font-medium">
				The writers are checking for repeated clues…
			</h2>
		</div>
	{:else}
		<Timer {deadlineAt} count={defaultTimer} submitAnswer={submit} />

		<div class="mx-auto max-w-md space-y-3">
			<div>
				<h2 class="text-xl font-semibold">Mark repeated clues</h2>
				<div class="text-muted-foreground text-sm">
					Secret word <span class="text-foreground font-semibold">{secretWord}</span>
				</div>
			</div>

			<div class="bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm">
				<p>
					If two clues are the same, mark them as <strong>repeated</strong>. The guesser won't see
					repeated clues.
				</p>
				<p class="text-muted-foreground mt-1">Decided by majority vote.</p>
			</div>

			<ul class="space-y-2">
				{#each clues as clue, index}
					{@const repeated = isRepeated(index)}
					{@const auto = repeatVotes.autoRemoved[index]}
					{@const marked = Boolean(myMarks[index])}
					<li>
						<button
							type="button"
							class="focus-visible:ring-ring flex w-full items-center gap-3 rounded-md border p-3 text-left focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default {marked
								? 'border-destructive'
								: ''}"
							aria-pressed={auto ? undefined : marked}
							disabled={auto || submitted}
							onclick={() => toggleMark(index)}
						>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span
										class="truncate text-lg font-semibold {repeated
											? 'text-muted-foreground line-through'
											: ''}"
									>
										{displayClue(clue)}
									</span>
									{#if repeated}
										<span
											class="bg-destructive/10 text-destructive rounded px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase"
										>
											Repeated
										</span>
									{/if}
								</div>
								<div class="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
									{#if auto}
										<span>{autoReason(clue)}</span>
									{:else}
										<span class="flex gap-0.5" aria-hidden="true">
											{#each { length: repeatVotes.voters } as _, dot}
												<span
													class="h-2 w-2 rounded-full {dot < (repeatVotes.counts[index] ?? 0)
														? 'bg-destructive'
														: 'bg-muted-foreground/30'}"
												></span>
											{/each}
										</span>
										<span>{voteNote(index)}</span>
										{#if isOneShort(index)}
											<span class="text-amber-600 dark:text-amber-400"
												>· 1 vote short of majority</span
											>
										{/if}
									{/if}
								</div>
							</div>
							{#if !auto}
								<span
									class="flex-none rounded-full border px-3 py-1.5 text-sm font-semibold {marked
										? 'border-destructive bg-destructive text-white'
										: 'text-muted-foreground'}"
								>
									{marked ? '✓ Marked' : 'Mark'}
								</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>

			<p class="text-muted-foreground text-center text-sm">
				{currentGuesser} will see
				<span class="text-foreground font-semibold">{pluralClues(shownCount)}</span>
			</p>

			<Button class="w-full" disabled={submitted} onclick={submit}>
				{submitted
					? `Waiting for the other writers · ${repeatVotes.done} of ${repeatVotes.voters} done`
					: 'Done'}
			</Button>
		</div>
	{/if}
</div>
