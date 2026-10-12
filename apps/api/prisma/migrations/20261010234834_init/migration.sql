-- CreateEnum
CREATE TYPE "AudienceCategory" AS ENUM ('CHILDREN', 'TEENS');

-- CreateEnum
CREATE TYPE "PuzzleType" AS ENUM ('NUMBER_SEQUENCE', 'MISSING_OPERATOR', 'SCHEDULING_ORDER', 'ONE_TRUE_STATEMENT', 'CONSTRAINED_ROUTE');

-- CreateEnum
CREATE TYPE "DomainCategory" AS ENUM ('math', 'logic', 'spatial', 'pattern', 'deduction');

-- CreateEnum
CREATE TYPE "AttemptResult" AS ENUM ('CORRECT', 'INCORRECT', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" VARCHAR(30) NOT NULL,
    "audienceCategory" "AudienceCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL DEFAULT 1,
    "type" "PuzzleType" NOT NULL,
    "domain" "DomainCategory" NOT NULL,
    "difficultyRating" DOUBLE PRECISION NOT NULL,
    "ageFloor" INTEGER NOT NULL,
    "ageCeiling" INTEGER NOT NULL,
    "audienceCategories" "AudienceCategory"[],
    "content" JSONB NOT NULL,
    "verification" JSONB NOT NULL,
    "staticHints" JSONB NOT NULL,
    "difficultyMetadata" JSONB NOT NULL,
    "fingerprintHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rotatedAt" TIMESTAMP(3),

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "contentVersionAtAttempt" INTEGER NOT NULL,
    "result" "AttemptResult" NOT NULL,
    "submittedAnswer" JSONB,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "elapsedTimeMs" INTEGER,
    "staticHintsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctAttempts" INTEGER NOT NULL DEFAULT 0,
    "dailyCompletions" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "HintUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "hintTier" INTEGER NOT NULL,
    "hintType" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HintUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "eventId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "CatalogState" (
    "id" TEXT NOT NULL DEFAULT 'catalog',
    "catalogGeneration" INTEGER NOT NULL DEFAULT 1,
    "pendingRotationCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRating" (
    "userId" TEXT NOT NULL,
    "domain" "DomainCategory" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "ratingDeviation" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("userId","domain")
);

-- CreateTable
CREATE TABLE "PuzzleSelectionStats" (
    "puzzleId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "alpha" DOUBLE PRECISION NOT NULL,
    "beta" DOUBLE PRECISION NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuzzleSelectionStats_pkey" PRIMARY KEY ("puzzleId","contentVersion")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_audienceCategory_idx" ON "User"("audienceCategory");

-- CreateIndex
CREATE INDEX "Puzzle_type_idx" ON "Puzzle"("type");

-- CreateIndex
CREATE INDEX "Puzzle_domain_idx" ON "Puzzle"("domain");

-- CreateIndex
CREATE INDEX "Puzzle_difficultyRating_idx" ON "Puzzle"("difficultyRating");

-- CreateIndex
CREATE INDEX "Puzzle_ageFloor_ageCeiling_idx" ON "Puzzle"("ageFloor", "ageCeiling");

-- CreateIndex
CREATE INDEX "Puzzle_fingerprintHash_idx" ON "Puzzle"("fingerprintHash");

-- CreateIndex
CREATE INDEX "Attempt_userId_createdAt_idx" ON "Attempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_userId_puzzleId_idx" ON "Attempt"("userId", "puzzleId");

-- CreateIndex
CREATE INDEX "Attempt_puzzleId_createdAt_idx" ON "Attempt"("puzzleId", "createdAt");

-- CreateIndex
CREATE INDEX "HintUsage_userId_usedAt_idx" ON "HintUsage"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "HintUsage_puzzleId_contentVersion_idx" ON "HintUsage"("puzzleId", "contentVersion");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HintUsage" ADD CONSTRAINT "HintUsage_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRating" ADD CONSTRAINT "UserRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
