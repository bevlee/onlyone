import {
  GameState,
  GamePhaseType,
  GamePhase,
  LobbyState,
  WritingCluesState,
  FilteringCluesState,
  GuessingWordState,
  EndGameState,
  WordSubmission,
  Clue,
  type GameEvent,
  type WriterClueSubmissionStageEvent,
  type GuesserClueSubmissionStageEvent,
  type ClueSubmittedEvent,
  type WriterClueFilteringStageEvent,
  type GuesserClueFilteringStageEvent,
  type ClueVotedEvent,
  type WriterWordGuessingStageEvent,
  type GuesserWordGuessingStageEvent,
  type GuessSubmittedEvent,
  type EndRoundEvent,
  type ClueCommendedEvent,
  type GameCompletedEvent,
  SecretWordWritingState,
} from '@onlyone/shared';
import { randomUUID } from 'crypto'
/**
 * GameService handles all game state transitions through event sourcing
 * State is immutable; events are applied directly to mutable references
 * All events are persisted to NATS for replay and audit trail
 */
export class GameService {
  /**
   * Initialize a new game state for a room
   */
  static createInitialGameState(options: Partial<GameState> = {}): GameState {
    return {
      matchId: randomUUID(),
      gamesWon: 0,
      gamesPlayed: 0,
      eventCount: 0,
      currentRoundIndex: 0,
      wordPool: [],
      events: [],
      gamePhase: {
        phase: GamePhaseType.SecretWordWriting,
        state: {
          submissions: new Map<string, string>()
        } as SecretWordWritingState,
      },
      ...options,
    };
  }

  /**
   * StartGame: Transition from Lobby word collection to WritingClues phase
   */
  private static applyStartGame(state: GameState): void {
    const lobbyState = state.gamePhase.state as LobbyState;

    const writingState: WritingCluesState = {
      secretWord: '',
      guessingPlayer: '',
      wordSubmitter: '',
      clues: [],
      submittedBy: new Set(),
      roundIndex: 0,
    };

    state.gamePhase = {
      phase: GamePhaseType.WritingClues,
      state: writingState,
    };
  }

  /**
   * Apply an event to game state, mutating the state in place
   * Assumes event has been validated by validateEvent() first.
   * Do NOT call this without validation.
   * 
   */
  static applyEvent(state: GameState, event: GameEvent): void {
    this.validateEventForCurrentPhase(state, event);

    switch (event.type) {
      case 'StartGame':
        this.applyStartGame(state);
        break;
      case 'WritingCluesStage':
        // Handle both writer and guesser variant
        if ('clueText' in event) {
          this.applyWriterClueSubmissionStage(state, event as WriterClueSubmissionStageEvent);
        } else {
          this.applyGuesserClueSubmissionStage(state, event as GuesserClueSubmissionStageEvent);
        }
        break;
      case 'ClueSubmitted':
        this.applyClueSubmitted(state, event as ClueSubmittedEvent);
        break;
      case 'ClueFilteringStage':
        // Handle both writer and guesser variant
        if ('clues' in event) {
          this.applyWriterClueFilteringStage(state, event as WriterClueFilteringStageEvent);
        } else {
          this.applyGuesserClueFilteringStage(state, event as GuesserClueFilteringStageEvent);
        }
        break;
      case 'ClueVoted':
        this.applyClueVoted(state, event as ClueVotedEvent);
        break;
      case 'GuessingStarted':
        // Handle both writer and guesser variant
        if ('clues' in event) {
          this.applyWriterGuessingStarted(state, event as WriterWordGuessingStageEvent);
        } else {
          this.applyGuesserGuessingStarted(state, event as GuesserWordGuessingStageEvent);
        }
        break;
      case 'GuessSubmitted':
        this.applyGuessSubmitted(state, event as GuessSubmittedEvent);
        break;
      case 'EndRound':
        this.applyEndRound(state, event as EndRoundEvent);
        break;
      case 'ClueCommended':
        this.applyClueCommended(state, event as ClueCommendedEvent);
        break;
      case 'GameCompleted':
        this.applyGameCompleted(state, event as GameCompletedEvent);
        break;
    }

    // Track event
    state.events.push(event as any);
    state.eventCount += 1;
  }

  /**
   * Validate that an event is legal for the current game phase
   */
  private static validateEventForCurrentPhase(
    state: GameState,
    event: GameEvent
  ): void {
    const currentPhase = state.gamePhase.phase;

    switch (event.type) {
      case 'StartGame':
        if (currentPhase !== GamePhaseType.Lobby) {
          throw new Error(
            `Cannot start game outside Lobby phase`
          );
        }
        break;

      case 'WritingCluesStage':
        if (currentPhase !== GamePhaseType.WritingClues) {
          throw new Error(
            `Cannot process WritingCluesStage event outside WritingClues phase`
          );
        }
        break;

      case 'ClueSubmitted':
        if (currentPhase !== GamePhaseType.WritingClues) {
          throw new Error(
            `Cannot submit clue outside WritingClues phase`
          );
        }
        break;

      case 'ClueFilteringStage':
        if (currentPhase !== GamePhaseType.FilteringClues) {
          throw new Error(
            `Cannot process ClueFilteringStage event outside FilteringClues phase`
          );
        }
        break;

      case 'ClueVoted':
        if (currentPhase !== GamePhaseType.FilteringClues) {
          throw new Error(
            `Cannot vote on clues outside FilteringClues phase`
          );
        }
        break;

      case 'GuessingStarted':
        if (currentPhase !== GamePhaseType.GuessingWord) {
          throw new Error(
            `Cannot start guessing outside GuessingWord phase`
          );
        }
        break;

      case 'GuessSubmitted':
        if (currentPhase !== GamePhaseType.GuessingWord) {
          throw new Error(
            `Cannot submit guess outside GuessingWord phase`
          );
        }
        break;

      case 'EndRound':
        if (currentPhase !== GamePhaseType.EndGame) {
          throw new Error(
            `Cannot end round outside EndGame phase`
          );
        }
        break;

      case 'ClueCommended':
        if (currentPhase !== GamePhaseType.EndGame) {
          throw new Error(
            `Cannot commend outside EndGame phase`
          );
        }
        break;

      case 'GameCompleted':
        if (currentPhase !== GamePhaseType.EndGame) {
          throw new Error(
            `Cannot complete game outside EndGame phase`
          );
        }
        break;
    }
  }

  /**
   * WritingCluesStage: Writer receives initial stage setup
   */
  private static applyWriterClueSubmissionStage(
    state: GameState,
    event: WriterClueSubmissionStageEvent
  ): void {
    // Writer is informed about the round setup
    state.currentRoundIndex = event.roundIndex;

    // Mark word as used
    const word = state.wordPool.find(w => w.word === event.clueText);
    if (word) {
      word.used = true;
    }

    const writingState: WritingCluesState = {
      secretWord: event.clueText,
      guessingPlayer: event.guessingPlayerId,
      wordSubmitter: event.submitterId,
      clues: [],
      submittedBy: new Set(),
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.WritingClues,
      state: writingState,
    };
  }

  /**
   * WritingCluesStage: Guesser receives initial stage setup
   */
  private static applyGuesserClueSubmissionStage(
    state: GameState,
    event: GuesserClueSubmissionStageEvent
  ): void {
    // Guesser is informed about the round (without secret word)
    state.currentRoundIndex = event.roundIndex;

    const writingState: WritingCluesState = {
      secretWord: '',
      guessingPlayer: event.guessingPlayerId,
      wordSubmitter: '',
      clues: [],
      submittedBy: new Set(),
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.WritingClues,
      state: writingState,
    };
  }

  /**
   * WritingClues: Player submits a clue
   */
  private static applyClueSubmitted(
    state: GameState,
    event: ClueSubmittedEvent
  ): void {
    const writingState = state.gamePhase.state as WritingCluesState;

    const clue: Clue = {
      text: event.clueText,
      submitter: event.submitterId,
      votes: { helpful: 0, creative: 0 },
      wasFiltered: false,
      nonDuplicate: true,
      submittedAt: event.timestamp,
    };

    writingState.clues.push(clue);
    writingState.submittedBy.add(event.submitterId);
  }

  /**
   * ClueFilteringStage: Writer receives clues for filtering
   */
  private static applyWriterClueFilteringStage(
    state: GameState,
    event: WriterClueFilteringStageEvent
  ): void {
    const writingState = state.gamePhase.state as WritingCluesState;

    const filteringState: FilteringCluesState = {
      secretWord: writingState.secretWord,
      guessingPlayer: writingState.guessingPlayer,
      wordSubmitter: writingState.wordSubmitter,
      clues: event.clues.map(c => ({
        text: c.text,
        submitter: c.submitterId,
        votes: { helpful: 0, creative: 0 },
        wasFiltered: c.duplicate,
        nonDuplicate: !c.duplicate,
        submittedAt: c.submittedAt,
      })),
      dedupedClues: [],
      votes: new Map(),
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.FilteringClues,
      state: filteringState,
    };
  }

  /**
   * ClueFilteringStage: Guesser receives clues for filtering
   */
  private static applyGuesserClueFilteringStage(
    state: GameState,
    event: GuesserClueFilteringStageEvent
  ): void {
    const writingState = state.gamePhase.state as WritingCluesState;

    const filteringState: FilteringCluesState = {
      secretWord: writingState.secretWord,
      guessingPlayer: writingState.guessingPlayer,
      wordSubmitter: writingState.wordSubmitter,
      clues: [],
      dedupedClues: [],
      votes: new Map(),
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.FilteringClues,
      state: filteringState,
    };
  }

  /**
   * FilteringClues: Player votes on a clue
   */
  private static applyClueVoted(
    state: GameState,
    event: ClueVotedEvent
  ): void {
    const filteringState = state.gamePhase.state as FilteringCluesState;

    let voteEntry = filteringState.votes.get(event.clueText);
    if (!voteEntry) {
      voteEntry = { keep: 0, remove: 0, voters: new Set() };
      filteringState.votes.set(event.clueText, voteEntry);
    }

    // Prevent duplicate votes from same player
    if (voteEntry.voters.has(event.voterId)) {
      throw new Error(`Player ${event.voterId} has already voted on this clue`);
    }

    if (event.vote === 'keep') {
      voteEntry.keep += 1;
    } else {
      voteEntry.remove += 1;
    }

    voteEntry.voters.add(event.voterId);
  }

  /**
   * GuessingStarted: Writer receives deduped clues and unfiltered clues
   */
  private static applyWriterGuessingStarted(
    state: GameState,
    event: WriterWordGuessingStageEvent
  ): void {
    const filteringState = state.gamePhase.state as FilteringCluesState;

    const guessingState: GuessingWordState = {
      secretWord: filteringState.secretWord,
      guessingPlayer: event.guessingPlayerId,
      wordSubmitter: filteringState.wordSubmitter,
      dedupedClues: event.dedupedClues.map(c => ({
        text: c.text,
        submitter: c.submitterId,
        votes: { helpful: 0, creative: 0 },
        wasFiltered: false,
        nonDuplicate: true,
        submittedAt: new Date(),
      })),
      guess: '',
      guessSubmitted: false,
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.GuessingWord,
      state: guessingState,
    };
  }

  /**
   * GuessingStarted: Guesser receives deduped clues only
   */
  private static applyGuesserGuessingStarted(
    state: GameState,
    event: GuesserWordGuessingStageEvent
  ): void {
    const filteringState = state.gamePhase.state as FilteringCluesState;

    const guessingState: GuessingWordState = {
      secretWord: filteringState.secretWord,
      guessingPlayer: event.guessingPlayerId,
      wordSubmitter: filteringState.wordSubmitter,
      dedupedClues: event.dedupedClues.map(c => ({
        text: c.text,
        submitter: c.submitterId,
        votes: { helpful: 0, creative: 0 },
        wasFiltered: false,
        nonDuplicate: true,
        submittedAt: new Date(),
      })),
      guess: '',
      guessSubmitted: false,
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.GuessingWord,
      state: guessingState,
    };
  }

  /**
   * GuessingWord: Guesser submits their guess
   */
  private static applyGuessSubmitted(
    state: GameState,
    event: GuessSubmittedEvent
  ): void {
    const guessingState = state.gamePhase.state as GuessingWordState;

    if (guessingState.guessSubmitted) {
      throw new Error('Guess has already been submitted for this round');
    }

    guessingState.guess = event.guess;
    guessingState.guessSubmitted = true;

    // Validate guess matches event's isCorrect flag
    const isActuallyCorrect =
      event.guess.toLowerCase().trim() ===
      guessingState.secretWord.toLowerCase().trim();

    if (isActuallyCorrect !== event.isCorrect) {
      throw new Error('Guess correctness validation failed');
    }
  }

  /**
   * EndRound: Round ends and transitions to EndGame phase
   */
  private static applyEndRound(
    state: GameState,
    event: EndRoundEvent
  ): void {
    const guessingState = state.gamePhase.state as GuessingWordState;

    const endGameState: EndGameState = {
      secretWord: event.secretWord,
      guessingPlayer: event.guessingPlayerId,
      wordSubmitter: event.wordSubmitterId,
      guess: event.finalGuess,
      success: event.success,
      clues: event.clues.map(c => ({
        text: c.text,
        submitter: c.submitterId,
        votes: { helpful: 0, creative: 0 },
        wasFiltered: false,
        nonDuplicate: true,
        submittedAt: new Date(),
      })),
      playerCommends: {},
      playerCommendHistory: {},
      roundIndex: event.roundIndex,
    };

    state.gamePhase = {
      phase: GamePhaseType.EndGame,
      state: endGameState,
    };

    // Update game stats
    if (event.success) {
      state.gamesWon += 1;
    }
    state.gamesPlayed += 1;
  }

  /**
   * EndGame: Player commends a clue
   */
  private static applyClueCommended(
    state: GameState,
    event: ClueCommendedEvent
  ): void {
    const endGameState = state.gamePhase.state as EndGameState;

    if (!endGameState.playerCommends[event.clueText]) {
      endGameState.playerCommends[event.clueText] = {
        helpful: 0,
        creative: 0,
      };
    }

    endGameState.playerCommends[event.clueText][event.commendType] += 1;

    // Track commend history
    if (!endGameState.playerCommendHistory[event.commenderId]) {
      endGameState.playerCommendHistory[event.commenderId] = [];
    }
    endGameState.playerCommendHistory[event.commenderId].push(
      event.clueText
    );
  }

  /**
   * EndGame → Lobby: All words played, game complete
   */
  private static applyGameCompleted(
    state: GameState,
    event: GameCompletedEvent
  ): void {
    // Reset to lobby
    const lobbyState: LobbyState = {
      minPlayersToStart: 2,
      words: [],
      wordCollectionPhase: true,
    };

    state.gamePhase = {
      phase: GamePhaseType.Lobby,
      state: lobbyState,
    };

    state.currentRoundIndex = 0;
    state.wordPool = [];
  }

  /**
   * Get next unplayed word and determine guesser
   * Guesser must be a player who did NOT submit this word
   */
  static getNextWordAndGuesser(
    state: GameState,
    allPlayerIds: string[]
  ): { word: string; wordSubmitterId: string; guessingPlayerId: string } | null {
    const unplayedWord = state.wordPool.find(w => !w.used);
    if (!unplayedWord) {
      return null;
    }

    // Find a guesser who is not the word submitter
    const eligibleGuessers = allPlayerIds.filter(
      id => id !== unplayedWord.submittedBy
    );

    if (eligibleGuessers.length === 0) {
      return null;
    }

    // Rotate guesser selection
    const guesserIndex = state.currentRoundIndex % eligibleGuessers.length;
    const guessingPlayerId = eligibleGuessers[guesserIndex];

    return {
      word: unplayedWord.word,
      wordSubmitterId: unplayedWord.submittedBy,
      guessingPlayerId,
    };
  }

  /**
   * Check if game should end (all words played)
   */
  static shouldGameEnd(state: GameState): boolean {
    return state.wordPool.every(w => w.used);
  }

  /**
   * Fill missing words from default wordlist if players don't submit enough
   */
  static fillWordsFromDefaults(
    state: GameState,
    playerCount: number,
    existingWords: string[]
  ): void {
    const requiredWords = playerCount * 2;
    const missingCount = requiredWords - existingWords.length;

    if (missingCount <= 0) {
      return;
    }

    // Filter out words already submitted
    const availableDefaults = DEFAULT_WORDLIST.filter(
      w => !existingWords.includes(w.toLowerCase())
    );

    // Add defaults until we have enough words
    let defaultIndex = 0;
    for (let i = 0; i < missingCount && defaultIndex < availableDefaults.length; i++) {
      state.wordPool.push({
        word: availableDefaults[defaultIndex],
        submittedBy: 'system',
        submittedAt: new Date(),
        used: false,
      });
      defaultIndex += 1;
    }
  }
}
