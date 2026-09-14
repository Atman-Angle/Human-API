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
  affectedClaimId: z.string().min(1),
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

export const MissionStatusSchema = z.enum(["OPEN", "CLOSED"]);
export type MissionStatus = z.infer<typeof MissionStatusSchema>;
export const MISSION_STATUSES = MissionStatusSchema.options;
export const MISSION_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const EvidenceMissionSchema = z.object({
  id: z.string().min(1),
  investigationId: z.string().min(1),
  evidenceGapId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  qualification: z.array(z.string().min(1)).min(1),
  questions: z.array(MissionQuestionSchema).min(1),
  status: MissionStatusSchema,
  /** @deprecated Retained only for Golden Demo compatibility; do not add new dependencies. */
  estimatedSeconds: z.number().int().positive().max(60),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().optional(),
  closedReason: z.string().min(1).optional(),
});
export type EvidenceMission = z.infer<typeof EvidenceMissionSchema>;

export const InvestigationListItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  knowledgeState: KnowledgeStateStatusSchema,
  missionCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InvestigationListItem = z.infer<typeof InvestigationListItemSchema>;

export const MissionListItemSchema = z.object({
  id: z.string().min(1),
  investigationId: z.string().min(1),
  evidenceGapId: z.string().min(1),
  title: z.string().min(1),
  status: MissionStatusSchema,
  evidenceCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type MissionListItem = z.infer<typeof MissionListItemSchema>;

export const EvidenceSubmissionSchema = z.object({
  demoSample: z.boolean().optional(),
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

export const ImpactReceiptSchema = z.object({
  evidenceId: z.string().min(1),
  missionId: z.string().min(1),
  investigationId: z.string().min(1),
  accepted: z.boolean(),
  grade: EvidenceGradeSchema,
  affectedClaimId: z.string().min(1),
  stateBefore: KnowledgeStateStatusSchema,
  stateAfter: KnowledgeStateStatusSchema,
  impactSummary: z.string().min(1),
  contribution: z
    .object({
      observation: z.string().min(1).optional(),
      explanation: z.string().min(1),
      boundary: z.string().min(1),
    })
    .optional(),
  stillMissing: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type ImpactReceipt = z.infer<typeof ImpactReceiptSchema>;

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

export const DiscussionClassificationSchema = z.enum([
  "OPINION",
  "CLAIM_CANDIDATE",
  "OBSERVATION",
  "COUNTEREXAMPLE",
  "LIMITATION",
  "EVIDENCE_GAP",
]);
export type DiscussionClassification = z.infer<typeof DiscussionClassificationSchema>;
export const DiscussionInputSchema = z
  .object({
    id: z.string().min(1),
    knowledgeObjectId: z.string().min(1).optional(),
    investigationId: z.string().min(1).optional(),
    content: z.string().min(1),
    authorLabel: z.string().min(1).optional(),
    authorId: z.string().min(1).optional(),
    createdAt: z.string().datetime(),
    source: z.string().min(1),
  })
  .refine((v) => v.knowledgeObjectId || v.investigationId, {
    message: "knowledgeObjectId or investigationId is required",
  });
export type DiscussionInput = z.infer<typeof DiscussionInputSchema>;
export const DiscussionOrganizationSchema = z.object({
  discussionId: z.string().min(1),
  routing: z
    .object({
      knowledgeObjectId: z.string().min(1).optional(),
      confidence: z.number().min(0).max(1),
      uncertain: z.boolean(),
      rationale: z.string().min(1),
    })
    .optional(),
  classifications: z.array(
    z.object({
      label: DiscussionClassificationSchema,
      text: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ),
  claims: z.array(ClaimAssessmentSchema),
  gaps: z.array(EvidenceGapSchema),
  limitations: z.array(z.string()),
  relations: z
    .array(
      z.object({
        claimId: z.string().min(1),
        relation: z.enum(["SUPPORTS", "CHALLENGES", "LIMITS", "OPENS_QUESTION"]),
        rationale: z.string().min(1),
      }),
    )
    .default([]),
  summary: z.string().min(1).optional(),
  missionRecommended: z.boolean().optional(),
  recommendedMissionGapId: z.string().optional(),
});
export type DiscussionOrganization = z.infer<typeof DiscussionOrganizationSchema>;
export const LLMProvenanceSchema = z.enum(["LIVE", "CACHE", "GOLDEN_FIXTURE"]);
export const LLMRunSchema = z.object({
  runId: z.string().min(1),
  agentAction: z.string().min(1),
  inputRefs: z.array(z.string()),
  model: z.string().min(1),
  provenance: LLMProvenanceSchema,
  status: z.enum(["SUCCEEDED", "FALLBACK", "FAILED"]),
  structuredOutput: z.unknown(),
  limitations: z.array(z.string()),
  createdAt: z.string().datetime(),
  fallbackReason: z.string().optional(),
});
export type LLMRun = z.infer<typeof LLMRunSchema>;

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
  impactReceipts: z.array(ImpactReceiptSchema).optional(),
  knowledgeState: KnowledgeStateSchema,
  reevaluation: ReEvaluationSchema.optional(),
  discussions: z.array(DiscussionInputSchema).default([]),
  discussionOrganizations: z.array(DiscussionOrganizationSchema).default([]),
  llmRuns: z.array(LLMRunSchema).default([]),
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
      "LLM_TIMEOUT",
      "LLM_RATE_LIMIT",
      "LLM_INVALID_RESPONSE",
      "LLM_UPSTREAM_UNAVAILABLE",
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

// Read-only user projections; all decisions remain in the existing domain authorities.
export const CommunitySummarySchema = z.object({
  consensus: z.array(z.string()),
  disagreements: z.array(z.string()),
  unknowns: z.array(z.string()),
  limitations: z.array(z.string()),
});
export const ChatRouteRequestSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  investigationId: z.string().min(1).optional(),
});
export const ChatRouteResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("DIRECT_ANSWER"),
    answer: z.string(),
    limitations: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("MATCHED_INVESTIGATION"),
    investigationId: z.string(),
    rationale: z.string(),
    summary: CommunitySummarySchema.optional(),
  }),
  z.object({
    kind: z.literal("CREATE_PROPOSAL"),
    proposalId: z.string(),
    question: z.string(),
    rationale: z.string(),
  }),
  z.object({ kind: z.literal("CLARIFICATION"), question: z.string() }),
]);
export type ChatRouteRequest = z.infer<typeof ChatRouteRequestSchema>;
export type ChatRouteResponse = z.infer<typeof ChatRouteResponseSchema>;
export const ParticipationRequestSchema = z.object({
  message: z.string().trim().min(1).max(6000),
  missionId: z.string().min(1).optional(),
});
export const ParticipationResponseSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("QUESTION"), answer: z.string(), limitations: z.array(z.string()) }),
  z.object({
    intent: z.literal("EVIDENCE_SUBMISSION"),
    missionId: z.string(),
    next: z.literal("CONVERSATION"),
  }),
  z.object({
    intent: z.literal("ADDITIONAL_CONTEXT"),
    accepted: z.literal(true),
    discussionId: z.string(),
  }),
  z.object({
    intent: z.literal("MISSION_INTEREST"),
    missionId: z.string(),
    title: z.string(),
    description: z.string(),
  }),
  z.object({ intent: z.literal("CLARIFICATION"), question: z.string() }),
]);
export type ParticipationRequest = z.infer<typeof ParticipationRequestSchema>;
export const ProposalSchema = z.object({
  proposalId: z.string(),
  question: z.string(),
  rationale: z.string(),
  createdAt: z.string().datetime(),
  investigationId: z.string().optional(),
});
export type Proposal = z.infer<typeof ProposalSchema>;
export const ActivityEventSchema = z.object({
  eventId: z.string(),
  investigationId: z.string(),
  eventType: z.enum([
    "CREATED",
    "DISCUSSION_ADDED",
    "EVIDENCE_ADDED",
    "MISSION_OPENED",
    "MISSION_CLOSED",
    "KNOWLEDGE_STATE_CHANGED",
    "IMPACT_RECEIPT_CREATED",
  ]),
  actorType: z.enum(["USER", "AGENT", "SYSTEM"]),
  summary: z.string(),
  createdAt: z.string().datetime(),
});
export const ActivityEventsResponseSchema = z.array(ActivityEventSchema);
export const MaintenanceRunSchema = z.object({
  runId: z.string(),
  investigationId: z.string(),
  trigger: z.string(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  stateBefore: KnowledgeStateStatusSchema,
  stateAfter: KnowledgeStateStatusSchema,
  changed: z.boolean(),
  createdMissionIds: z.array(z.string()),
  closedMissionIds: z.array(z.string()),
  limitations: z.array(z.string()),
  errorCode: z.string().optional(),
});
export type MaintenanceRun = z.infer<typeof MaintenanceRunSchema>;

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export const DiscoveryTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: CommunitySummarySchema,
  sourceCount: z.number().int().nonnegative(),
  discussionCount: z.number().int().nonnegative(),
  knowledgeState: KnowledgeStateStatusSchema,
  provenance: z.object({ zhihu: SearchProvenanceSchema, global: SearchProvenanceSchema }),
  activeInvitation: EvidenceMissionSchema.optional(),
  updatedAt: z.string().datetime(),
});
export type DiscoveryTopic = z.infer<typeof DiscoveryTopicSchema>;
export const DiscoveryTopicsResponseSchema = z.array(DiscoveryTopicSchema);
export const KnowledgeObjectProjectionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("KNOWLEDGE_OBJECT"),
  question: z.string().min(1),
  claims: z.array(ClaimAssessmentSchema),
  knowledgeState: KnowledgeStateSchema,
  evidenceGaps: z.array(EvidenceGapSchema),
  missions: z.array(EvidenceMissionSchema),
  evidence: z.array(EvidenceRecordSchema),
  discussions: z.array(DiscussionInputSchema),
  discussionOrganizations: z.array(DiscussionOrganizationSchema),
  llmRuns: z.array(LLMRunSchema),
  reevaluation: ReEvaluationSchema.optional(),
  provenance: z.object({ search: DiscoveryTopicSchema.shape.provenance }),
  sources: z.array(SourceRefSchema),
  summary: CommunitySummarySchema,
  activeInvitation: EvidenceMissionSchema.optional(),
  impactReceipts: z.array(ImpactReceiptSchema),
  updatedAt: z.string().datetime(),
});
export type KnowledgeObjectProjection = z.infer<typeof KnowledgeObjectProjectionSchema>;

// Conversation is application preparation only, never an Evidence decision.
export const ConversationDraftRequestSchema = z.object({
  answers: z.array(z.string().trim().min(1).max(6000)).max(3),
});
export const ConversationDraftSchema = z.object({
  question: z.string().optional(),
  summary: z.string(),
  followUpCount: z.number().int().min(0).max(2),
  preparation: z.literal("EXTRACTIVE_RULES"),
  limitations: z.array(z.string()),
});
export type ConversationDraft = z.infer<typeof ConversationDraftSchema>;
export const ConfirmObservationRequestSchema = z.object({
  confirmed: z.literal(true),
  summary: z.string().trim().min(1).max(18000),
  demoSample: z.boolean().default(false),
});
export type ConfirmObservationRequest = z.infer<typeof ConfirmObservationRequestSchema>;
export const EvidenceIntakeResponseSchema = z.object({
  record: EvidenceRecordSchema,
  receipt: ImpactReceiptSchema,
  investigation: InvestigationSchema,
});
export type EvidenceIntakeResponse = z.infer<typeof EvidenceIntakeResponseSchema>;
