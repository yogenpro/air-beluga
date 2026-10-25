import type { z } from 'zod';
import type {
  ContentBundleSchema,
  ContentManifestSchema,
  DailyPoolSchema,
  DecisionSchema,
  DifficultySchema,
  GameSessionSchema,
  PassengerCaseSchema,
  RuleSnapshotSchema,
  ScoringConfigSchema,
  StageSchema,
  TravelDocumentSchema,
} from '../content/schemas';

export type ContentBundle = z.infer<typeof ContentBundleSchema>;
export type ContentManifest = z.infer<typeof ContentManifestSchema>;
export type PassengerCase = z.infer<typeof PassengerCaseSchema>;
export type TravelDocument = z.infer<typeof TravelDocumentSchema>;
export type RuleSnapshot = z.infer<typeof RuleSnapshotSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type DailyPool = z.infer<typeof DailyPoolSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type GameSession = z.infer<typeof GameSessionSchema>;
export type CaseResult = GameSession['results'][number];
export type Score = CaseResult['score'];
export type ResolutionPath = PassengerCase['resolution']['paths'][number];
