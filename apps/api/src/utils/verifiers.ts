export type PuzzleType =
  | 'NUMBER_SEQUENCE'
  | 'MISSING_OPERATOR'
  | 'SCHEDULING_ORDER'
  | 'ONE_TRUE_STATEMENT'
  | 'CONSTRAINED_ROUTE';

export interface VerifyAnswerInput {
  puzzle: {
    id: string;
    type: PuzzleType;
    contentVersion: number;
    content: unknown;
    verification: unknown;
  };
  submittedAnswer: string;
}

export interface VerifyAnswerResult {
  result: 'correct' | 'incorrect';
}

export interface AnswerVerifier {
  readonly type: PuzzleType;
  verify(input: VerifyAnswerInput): VerifyAnswerResult;
}

function normalizeNumberSequenceAnswer(answer: string): number | null {
  const trimmed = answer.trim().replace(/[\u2212\u2013\u2014]/g, '-').replace(/,/g, '');
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMissingOperatorAnswer(answer: string): string {
  return answer.trim()
    .replace(/\s+/g, '')
    .replace(/[x×]/g, '*')
    .replace(/[÷:]/g, '/');
}

function normalizeSchedulingOrderAnswer(answer: string): string[] {
  return answer.trim()
    .toUpperCase()
    .split(/[,\s→>]+/)
    .filter(Boolean);
}

function normalizeOneTrueStatementAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeConstrainedRouteAnswer(answer: string): string {
  return answer.trim().toUpperCase().replace(/[^UDLR]/g, '');
}

class NumberSequenceVerifier implements AnswerVerifier {
  readonly type = 'NUMBER_SEQUENCE' as const;

  verify(input: VerifyAnswerInput): VerifyAnswerResult {
    const verification = input.puzzle.verification as {
      canonicalAnswer: number;
      acceptedAnswers: string[];
    };
    const normalized = normalizeNumberSequenceAnswer(input.submittedAnswer);
    if (normalized === null) return { result: 'incorrect' };
    return { result: normalized === verification.canonicalAnswer ? 'correct' : 'incorrect' };
  }
}

class MissingOperatorVerifier implements AnswerVerifier {
  readonly type = 'MISSING_OPERATOR' as const;

  verify(input: VerifyAnswerInput): VerifyAnswerResult {
    const verification = input.puzzle.verification as {
      acceptedAnswers: string[];
    };
    const normalized = normalizeMissingOperatorAnswer(input.submittedAnswer);
    return { result: verification.acceptedAnswers.includes(normalized) ? 'correct' : 'incorrect' };
  }
}

class SchedulingOrderVerifier implements AnswerVerifier {
  readonly type = 'SCHEDULING_ORDER' as const;

  verify(input: VerifyAnswerInput): VerifyAnswerResult {
    const verification = input.puzzle.verification as {
      acceptedAnswers: string[];
    };
    const normalized = normalizeSchedulingOrderAnswer(input.submittedAnswer);
    return { result: verification.acceptedAnswers.includes(normalized.join(',')) ? 'correct' : 'incorrect' };
  }
}

class OneTrueStatementVerifier implements AnswerVerifier {
  readonly type = 'ONE_TRUE_STATEMENT' as const;

  verify(input: VerifyAnswerInput): VerifyAnswerResult {
    const verification = input.puzzle.verification as {
      acceptedAnswers: string[];
    };
    const normalized = normalizeOneTrueStatementAnswer(input.submittedAnswer);
    return { result: verification.acceptedAnswers.includes(normalized) ? 'correct' : 'incorrect' };
  }
}

class ConstrainedRouteVerifier implements AnswerVerifier {
  readonly type = 'CONSTRAINED_ROUTE' as const;

  verify(input: VerifyAnswerInput): VerifyAnswerResult {
    const verification = input.puzzle.verification as {
      acceptedAnswers: string[];
    };
    const normalized = normalizeConstrainedRouteAnswer(input.submittedAnswer);
    return { result: verification.acceptedAnswers.includes(normalized) ? 'correct' : 'incorrect' };
  }
}

export class VerifierRegistry {
  private readonly byType: ReadonlyMap<PuzzleType, AnswerVerifier>;

  constructor(verifiers: readonly AnswerVerifier[] = []) {
    const defaultVerifiers: AnswerVerifier[] = [
      new NumberSequenceVerifier(),
      new MissingOperatorVerifier(),
      new SchedulingOrderVerifier(),
      new OneTrueStatementVerifier(),
      new ConstrainedRouteVerifier()
    ];
    const allVerifiers = [...defaultVerifiers, ...verifiers];
    this.byType = new Map(allVerifiers.map(v => [v.type, v]));
  }

  verify(puzzle: VerifyAnswerInput['puzzle'], submittedAnswer: string): VerifyAnswerResult {
    const verifier = this.byType.get(puzzle.type);
    if (!verifier) {
      throw new Error('VERIFIER_NOT_CONFIGURED');
    }
    return verifier.verify({ puzzle, submittedAnswer });
  }
}