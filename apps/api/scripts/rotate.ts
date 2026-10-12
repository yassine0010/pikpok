import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../src/utils/config';

const prisma = new PrismaClient();
const archivePath = config.archive.path;

async function rotate() {
  console.log('Starting puzzle rotation...');

  const catalogState = await prisma.catalogState.findUnique({ where: { id: 'catalog' } });
  if (!catalogState) {
    throw new Error('CatalogState not found');
  }

  const puzzle = await prisma.puzzle.findFirst({
    orderBy: { rotatedAt: 'asc' },
    select: {
      id: true,
      contentVersion: true,
      type: true,
      domain: true,
      difficultyRating: true,
      ageFloor: true,
      ageCeiling: true,
      audienceCategories: true,
      content: true,
      verification: true,
      staticHints: true,
      difficultyMetadata: true,
      fingerprintHash: true
    }
  });

  if (!puzzle) {
    throw new Error('No puzzles found in catalog');
  }

  console.log(`Rotating puzzle: ${puzzle.id} (v${puzzle.contentVersion})`);

  const archiveDir = join(archivePath, 'puzzles', puzzle.id);
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  const archiveFile = join(archiveDir, `v${puzzle.contentVersion}.json`);
  const archiveData = {
    id: puzzle.id,
    contentVersion: puzzle.contentVersion,
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
    fingerprintHash: puzzle.fingerprintHash,
    archivedAt: new Date().toISOString()
  };
  writeFileSync(archiveFile, JSON.stringify(archiveData, null, 2));
  console.log(`Archived to ${archiveFile}`);

  const newContent = {
    prompt: `[ROTATED v${puzzle.contentVersion + 1}] ${puzzle.content.prompt || 'Updated puzzle content'}`,
    ...puzzle.content
  };

  await prisma.puzzle.update({
    where: { id: puzzle.id },
    data: {
      contentVersion: { increment: 1 },
      content: newContent,
      rotatedAt: new Date()
    }
  });

  const newPendingCount = catalogState.pendingRotationCount + 1;
  const newCatalogGeneration = newPendingCount >= 5 ? catalogState.catalogGeneration + 1 : catalogState.catalogGeneration;
  const resetPendingCount = newPendingCount >= 5 ? 0 : newPendingCount;

  await prisma.catalogState.update({
    where: { id: 'catalog' },
    data: {
      catalogGeneration: newCatalogGeneration,
      pendingRotationCount: resetPendingCount
    }
  });

  console.log(`Rotation complete! New version: ${puzzle.contentVersion + 1}`);
  console.log(`Catalog generation: ${newCatalogGeneration}, Pending: ${resetPendingCount}`);
}

rotate()
  .catch((e) => {
    console.error('Rotation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });