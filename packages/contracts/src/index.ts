import { z } from "zod";

export const KnowledgeStateStatusSchema = z.enum([
  "UNRESOLVED",
  "EARLY_EVIDENCE",
  "SUPPORTED_WITH_LIMITATIONS",
]);
export type KnowledgeStateStatus = z.infer<typeof KnowledgeStateStatusSchema>;
export const KNOWLEDGE_STATE_STATUSES = KnowledgeStateStatusSchema.options;
export const KNOWLEDGE_STATE = {
  UNRESOLVED: "UNRESOLVED",
  EARLY_EVIDENCE: "EARLY_EVIDENCE",
  SUPPORTED_WITH_LIMITATIONS: "SUPPORTED_WITH_LIMITATIONS",
} as const;

export const EvidenceGradeSchema = z.enum(["E0_OPINION", "E1_FIRST_HAND", "E2_ARTIFACT_BACKED"]);
export type EvidenceGrade = z.infer<typeof EvidenceGradeSchema>;
export const EVIDENCE_GRADES = EvidenceGradeSchema.options;
export const EVIDENCE_GRADE = {
  E0_OPINION: "E0_OPINION",
  E1_FIRST_HAND: "E1_FIRST_HAND",
  E2_ARTIFACT_BACKED: "E2_ARTIFACT_BACKED",
} as const;

export const SourceProviderSchema = z.enum(["ZHIHU", "GLOBAL"]);
export type SourceProvider = z.infer<typeof SourceProviderSchema>;
export const SOURCE_PROVIDER = {
  ZHIHU: "ZHIHU",
  GLOBAL: "GLOBAL",
} as const;

export const SearchProvenanceSchema = z.enum(["LIVE", "CACHE", "GOLDEN_FIXTURE"]);
export type SearchProvenance = z.infer<typeof SearchProvenanceSchema>;
export const SEARCH_PROVENANCE = {
  LIVE: "LIVE",
  CACHE: "CACHE",
  GOLDEN_FIXTURE: "GOLDEN_FIXTURE",
} as const;

export const SearchErrorCodeSchema = z.enum([
  "AUTH_REQUIRED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_RATE_LIMIT",
  "UPSTREAM_INVALID_RESPONSE",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_ERROR",
]);
export type SearchErrorCode = z.infer<typeof SearchErrorCodeSchema>;

export const NormalizedSearchErrorSchema = z.object({
  code: SearchErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  upstreamCode: z.string().optional(),
});
export type NormalizedSearchError = z.infer<typeof NormalizedSearchErrorSchema>;

export const SourceRefSchema = z.object({
  id: z.string().min(1),
  provider: SourceProviderSchema,
  contentId: z.string().min(1),
  contentType: z.string().min(1),
  title: z.string(),
  url: z.string().url(),
  authorName: z.string().optional(),
  excerpt: z.string(),
  publishedAt: z.string().optional(),
  authorityLevel: z.string().optional(),
  voteUpCount: z.number().int().nonnegative().optional(),
  commentCount: z.number().int().nonnegative().optional(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const SearchResponseSchema = z.object({
  query: z.string().min(1),
  provider: SourceProviderSchema,
  provenance: SearchProvenanceSchema,
  items: z.array(SourceRefSchema),
  hasMore: z.boolean(),
  retrievedAt: z.string().datetime(),
  searchHashId: z.string().optional(),
  limitations: z.array(z.string()),
  fallbackReason: NormalizedSearchErrorSchema.optional(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const AgentActionSchema = z.enum([
  "SEARCH_ZHIHU",
  "SEARCH_WEB",
  "ASSESS_EVIDENCE",
  "ASSESS_GAP_SUITABILITY",
  "REFRAME_GAP",
  "CREATE_MISSION",
  "STOP",
]);
export type AgentAction = z.infer<typeof AgentActionSchema>;
export const AGENT_ACTION = {
  SEARCH_ZHIHU: "SEARCH_ZHIHU",
  SEARCH_WEB: "SEARCH_WEB",
  ASSESS_EVIDENCE: "ASSESS_EVIDENCE",
  ASSESS_GAP_SUITABILITY: "ASSESS_GAP_SUITABILITY",
  REFRAME_GAP: "REFRAME_GAP",
  CREATE_MISSION: "CREATE_MISSION",
  STOP: "STOP",
} as const;

export const ClaimAssessmentSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  rationale: z.string().min(1),
  sourceRefIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
});
export type ClaimAssessment = z.infer<typeof ClaimAssessmentSchema>;

export const EvidenceGapSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  affectedClaim: z.string().min(1),
  whyUnresolved: z.string().min(1),
  missingObservation: z.string().min(1),
  targetParticipants: z.array(z.string().min(1)).min(1),
  expectedValue: z.string().min(1),
});
export type EvidenceGap = z.infer<typeof EvidenceGapSchema>;

export const GapSuitabilityStatusSchema = z.enum([
  "MISSION_READY",
  "NEEDS_REFRAMING",
  "NOT_SUITABLE_FOR_HUMAN_MISSION",
]);
export type GapSuitabilityStatus = z.infer<typeof GapSuitabilityStatusSchema>;
export const GAP_SUITABILITY_STATUS = {
  MISSION_READY: "MISSION_READY",
  NEEDS_REFRAMING: "NEEDS_REFRAMING",
  NOT_SUITABLE_FOR_HUMAN_MISSION: "NOT_SUITABLE_FOR_HUMAN_MISSION",
} as const;

export const GapSuitabilityResultSchema = z.object({
  status: GapSuitabilityStatusSchema,
  initialStatus: GapSuitabilityStatusSchema.optional(),
  singleObservation: z.boolean(),
  lowHumanCost: z.boolean(),
  decisionImpact: z.boolean(),
  prevalenceRisk: z.boolean(),
  standardizedMeasurementDependency: z.boolean(),
  reason: z.string().min(1),
  reframedGap: EvidenceGapSchema.optional(),
});
export type GapSuitabilityResult = z.infer<typeof GapSuitabilityResultSchema>;

export const MissionQuestionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["SINGLE_SELECT", "MULTI_SELECT", "SHORT_TEXT", "URL"]),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  required: z.boolean(),
});
export type MissionQuestion = z.infer<typeof MissionQuestionSchema>;

export const EvidenceMissionSchema = z.object({
  id: z.string().min(1),
  investigationId: z.string().min(1),
  evidenceGapId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  qualification: z.array(z.string().min(1)).min(1),
  questions: z.array(MissionQuestionSchema).min(1),
  estimatedSeconds: z.number().int().positive().max(60),
  createdAt: z.string().datetime(),
});
export type EvidenceMission = z.infer<typeof EvidenceMissionSchema>;

export const EvidenceSubmissionSchema = z.object({
  statement: z.string().min(1),
  participantType: z.string().min(1).optional(),
  experience: z.string().min(1).optional(),
  task: z.string().min(1).optional(),
  aiRole: z.string().min(1).optional(),
  humanJudgment: z.string().min(1).optional(),
  artifactUrl: z.string().url().optional(),
});
export type EvidenceSubmission = z.infer<typeof EvidenceSubmissionSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string().min(1),
  missionId: z.string().min(1),
  participantType: z.string().min(1),
  submission: EvidenceSubmissionSchema,
  observation: z.string().min(1),
  grade: EvidenceGradeSchema,
  gradeReason: z.string().min(1),
  matchesGap: z.boolean(),
  createdAt: z.string().datetime(),
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const KnowledgeStateSchema = z.object({
  status: KnowledgeStateStatusSchema,
  evidenceCount: z.number().int().nonnegative(),
  supported: z.array(ClaimAssessmentSchema),
  unsupported: z.array(ClaimAssessmentSchema),
  limitations: z.array(z.string()),
  nextGap: EvidenceGapSchema.optional(),
  updatedAt: z.string().datetime(),
});
export type KnowledgeState = z.infer<typeof KnowledgeStateSchema>;

export const EvidenceStateSchema = z.object({
  known: z.array(z.string()),
  disagreements: z.array(z.string()),
  supported: z.array(ClaimAssessmentSchema),
  unsupported: z.array(ClaimAssessmentSchema),
  limitations: z.array(z.string()),
  candidateGap: EvidenceGapSchema.optional(),
  gapSuitability: GapSuitabilityResultSchema.optional(),
  nextGap: EvidenceGapSchema.optional(),
});
export type EvidenceState = z.infer<typeof EvidenceStateSchema>;

export const ReEvaluationSchema = z.object({
  supportedNow: z.array(ClaimAssessmentSchema),
  stillUnsupported: z.array(ClaimAssessmentSchema),
  limitations: z.array(z.string()),
  knowledgeState: KnowledgeStateStatusSchema,
  whyStateChanged: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type ReEvaluation = z.infer<typeof ReEvaluationSchema>;

export const InvestigationSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  searches: z.object({
    zhihu: SearchResponseSchema,
    global: SearchResponseSchema,
  }),
  evidenceState: EvidenceStateSchema,
  actions: z.array(AgentActionSchema),
  missions: z.array(EvidenceMissionSchema),
  evidence: z.array(EvidenceRecordSchema),
  knowledgeState: KnowledgeStateSchema,
  reevaluation: ReEvaluationSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Investigation = z.infer<typeof InvestigationSchema>;

export const CreateInvestigationRequestSchema = z.object({
  question: z.string().trim().min(1).max(500),
});
export type CreateInvestigationRequest = z.infer<typeof CreateInvestigationRequestSchema>;

export const CreateMissionRequestSchema = z.object({
  gapId: z.string().min(1).optional(),
});
export type CreateMissionRequest = z.infer<typeof CreateMissionRequestSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "VALIDATION_ERROR",
      "NOT_FOUND",
      "UPSTREAM_TIMEOUT",
      "UPSTREAM_RATE_LIMIT",
      "UPSTREAM_INVALID_RESPONSE",
      "UPSTREAM_UNAVAILABLE",
      "UPSTREAM_ERROR",
      "AUTH_REQUIRED",
      "INTERNAL_ERROR",
    ]),
    message: z.string(),
    requestId: z.string().optional(),
    retryable: z.boolean(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const InvestigationResponseSchema = InvestigationSchema;
export type InvestigationResponse = Investigation;
