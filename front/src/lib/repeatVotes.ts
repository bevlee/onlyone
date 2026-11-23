/** Shared state of the repeated-clue vote, as sent by the server. Never says who voted. */
export interface RepeatVoteState {
	/** Writers who marked each clue as repeated. */
	counts: number[];
	/** Clues removed without a vote because they are empty or identical to another clue. */
	autoRemoved: boolean[];
	/** Votes needed for a majority. */
	required: number;
	/** Writers voting this round. */
	voters: number;
	/** Writers who have pressed Done. */
	done: number;
}

/** Empty state used before the voting phase starts. */
export const emptyRepeatVotes: RepeatVoteState = {
	counts: [],
	autoRemoved: [],
	required: 1,
	voters: 0,
	done: 0
};
