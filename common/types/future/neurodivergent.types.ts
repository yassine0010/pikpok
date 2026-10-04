/**
 * Deferred post-v1 neurodivergent and ADHD puzzle contracts.
 *
 * These types are not part of the active v1 audience, catalog, feed, or
 * generation contract. Do not import them into production code before the M7
 * product, accessibility, privacy, and clinical review is complete.
 *
 * The audience shape below is provisional. M7 must decide whether
 * neurodivergent support is an additive profile, a general accessibility
 * layer, or another model compatible with the active CHILDREN and TEENS age
 * categories.
 */

import type { GeneratedPuzzle } from '../puzzle.types';

export type DeferredAudienceCategory = 'NEURODIVERGENT';
export type DeferredPuzzleType = 'ADHD_TAP_CHALLENGE';
export type DeferredDomainCategory = 'sustained_attention';

export type DeferredNeurodivergentPuzzle<
  TContent = unknown,
  TVerification = unknown,
  TMetadata = unknown
> = Omit<
  GeneratedPuzzle<TContent, TVerification, TMetadata>,
  'type' | 'domain' | 'audienceCategories'
> & {
  type: DeferredPuzzleType;
  domain: DeferredDomainCategory;
  audienceCategories: DeferredAudienceCategory[];
};

export interface StimulusTrial {
  trialIndex: number;
  shape: string;
  color: string;
  isTarget: boolean;
}

export interface AdhdTapContent {
  instructions: string;
  responseWindowMs: number;
  interStimulusIntervalMs: number;
  stimuli: StimulusTrial[];
}

export interface AdhdTapVerification {
  scoringRule: 'REALTIME_MATCH';
  targetTrialIndices: number[];
  distractorTrialIndices: number[];
  passingAccuracy: number;
  maxFalsePositiveAllowed: number;
}

export interface AdhdTapMetadata {
  similarityLevel: number;
  distractorDensity: number;
  targetFrequency: number;
  ruleSwitchCount: number;
  responseWindowMs: number;
  totalTrials: number;
}

export type AdhdTapPuzzle = DeferredNeurodivergentPuzzle<
  AdhdTapContent,
  AdhdTapVerification,
  AdhdTapMetadata
>;
