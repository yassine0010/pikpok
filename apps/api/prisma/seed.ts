import { PrismaClient, PuzzleType, DomainCategory, AudienceCategory } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function fingerprintHash(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj, Object.keys(obj as object).sort())).digest('hex');
}

const samplePuzzles = [
  {
    id: 'number-seq-001',
    type: PuzzleType.NUMBER_SEQUENCE,
    domain: DomainCategory.math,
    difficultyRating: 1200,
    ageFloor: 8,
    ageCeiling: 12,
    audienceCategories: [AudienceCategory.CHILDREN] as AudienceCategory[],
    content: {
      prompt: 'What number comes next in the sequence?',
      sequence: [2, 4, 6, 8, null],
      displayFormat: ', ',
      inputPlaceholder: 'Enter number'
    },
    verification: {
      canonicalAnswer: 10,
      acceptedAnswers: ['10'],
      ruleDescription: 'Add 2 to each number',
      formula: 'a_n = 2n'
    },
    staticHints: [
      { tier: 1, type: 'guiding_question', content: 'What changes between each pair of numbers?' },
      { tier: 2, type: 'strategic_clue', content: 'The difference between consecutive numbers is always the same' },
      { tier: 3, type: 'step_walkthrough', content: '2 + 2 = 4, 4 + 2 = 6, 6 + 2 = 8, so 8 + 2 = 10' }
    ],
    difficultyMetadata: { formulaComplexity: 1, operandSize: 1, exampleCount: 4, ruleName: 'arithmetic_sequence', step: 2 }
  },
  {
    id: 'missing-op-001',
    type: PuzzleType.MISSING_OPERATOR,
    domain: DomainCategory.math,
    difficultyRating: 1100,
    ageFloor: 8,
    ageCeiling: 12,
    audienceCategories: [AudienceCategory.CHILDREN] as AudienceCategory[],
    content: {
      prompt: 'Fill in the missing operator',
      equation: '8 ? 2 = 16',
      allowedSymbols: ['+', '-', '*', '/'],
      inputPlaceholder: 'Enter operator'
    },
    verification: {
      canonicalAnswer: '*',
      acceptedAnswers: ['*', 'x', '×'],
      explanation: '8 multiplied by 2 equals 16'
    },
    staticHints: [
      { tier: 1, type: 'guiding_question', content: 'What operation turns 8 and 2 into 16?' },
      { tier: 2, type: 'strategic_clue', content: 'Think about multiplication tables' },
      { tier: 3, type: 'step_walkthrough', content: '8 × 2 = 16, so the missing operator is multiplication' }
    ],
    difficultyMetadata: { stepCount: 1, operatorComplexity: 1, missingType: 'operator', operandMagnitude: 2 }
  },
  {
    id: 'schedule-001',
    type: PuzzleType.SCHEDULING_ORDER,
    domain: DomainCategory.logic,
    difficultyRating: 1300,
    ageFloor: 10,
    ageCeiling: 14,
    audienceCategories: [AudienceCategory.CHILDREN, AudienceCategory.TEENS] as AudienceCategory[],
    content: {
      prompt: 'Arrange these activities in the correct order',
      items: [
        { id: 'a', label: 'Eat breakfast' },
        { id: 'b', label: 'Wake up' },
        { id: 'c', label: 'Brush teeth' },
        { id: 'd', label: 'Go to school' }
      ],
      clues: ['You wake up before eating', 'You brush teeth after eating', 'School is last'],
      inputPlaceholder: 'Enter order (e.g., b, a, c, d)'
    },
    verification: {
      canonicalOrder: ['b', 'a', 'c', 'd'],
      acceptedAnswers: ['b,a,c,d', 'b, a, c, d', 'b a c d', 'b a c d'],
      deductionChain: ['Wake up first', 'Then eat breakfast', 'Then brush teeth', 'Finally go to school'],
      uniqueSolutionVerified: true
    },
    staticHints: [
      { tier: 1, type: 'guiding_question', content: 'What happens first in a morning routine?' },
      { tier: 2, type: 'strategic_clue', content: 'Brushing teeth usually happens after eating' },
      { tier: 3, type: 'step_walkthrough', content: 'Wake up → Eat breakfast → Brush teeth → Go to school' }
    ],
    difficultyMetadata: { itemCount: 4, constraintComplexity: 2, items: ['a', 'b', 'c', 'd'] }
  }
];

async function main() {
  console.log('Seeding database...');

  for (const puzzle of samplePuzzles) {
    const hash = fingerprintHash({
      type: puzzle.type,
      content: puzzle.content,
      verification: puzzle.verification
    });

    await prisma.puzzle.upsert({
      where: { id: puzzle.id },
      update: {
        contentVersion: { increment: 1 },
        content: puzzle.content,
        verification: puzzle.verification,
        staticHints: puzzle.staticHints,
        difficultyMetadata: puzzle.difficultyMetadata,
        fingerprintHash: hash,
        rotatedAt: new Date()
      },
      create: {
        id: puzzle.id,
        contentVersion: 1,
        type: puzzle.type,
        domain: puzzle.domain,
        difficultyRating: puzzle.difficultyRating,
        ageFloor: puzzle.ageFloor,
        ageCeiling: puzzle.ageCeiling,
        audienceCategories: puzzle.audienceCategories,
        content: puzzle.content,
        verification: puzzle.verification,
        staticHints: puzzle.staticHints,
        difficultyMetadata: puzzle.difficultyMetadata,
        fingerprintHash: hash
      }
    });

    console.log(`Seeded puzzle: ${puzzle.id}`);
  }

  await prisma.catalogState.upsert({
    where: { id: 'catalog' },
    update: {},
    create: { id: 'catalog', catalogGeneration: 1, pendingRotationCount: 0 }
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });