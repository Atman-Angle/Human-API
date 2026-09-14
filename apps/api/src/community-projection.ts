import {
  DiscoveryTopicSchema,
  KnowledgeObjectProjectionSchema,
  MISSION_STATUS,
  type Investigation,
  type KnowledgeObjectProjection,
  type DiscoveryTopic,
} from "@human-api/contracts";

/** Read-only application projection; does not grade, infer claims, or create missions. */
export function projectKnowledgeObject(investigation: Investigation): KnowledgeObjectProjection {
  const gap = investigation.knowledgeState.nextGap;
  const sources = [
    ...new Map(
      [...investigation.searches.zhihu.items, ...investigation.searches.global.items].map(
        (source) => [`${source.provider}:${source.contentId}`, source],
      ),
    ).values(),
  ];
  return KnowledgeObjectProjectionSchema.parse({
    id: investigation.id,
    kind: "KNOWLEDGE_OBJECT",
    question: investigation.question,
    claims: [
      ...investigation.knowledgeState.supported,
      ...investigation.knowledgeState.unsupported,
    ],
    knowledgeState: investigation.knowledgeState,
    evidenceGaps: [
      ...new Map(
        [
          gap,
          investigation.evidenceState.nextGap,
          investigation.evidenceState.candidateGap,
          investigation.evidenceState.gapSuitability?.reframedGap,
        ].flatMap((item) => (item ? [[item.id, item] as const] : [])),
      ).values(),
    ],
    missions: investigation.missions,
    evidence: investigation.evidence,
    discussions: investigation.discussions,
    discussionOrganizations: investigation.discussionOrganizations,
    llmRuns: investigation.llmRuns,
    reevaluation: investigation.reevaluation,
    provenance: {
      search: {
        zhihu: investigation.searches.zhihu.provenance,
        global: investigation.searches.global.provenance,
      },
    },
    sources,
    summary: {
      consensus: investigation.evidenceState.supported.length
        ? investigation.evidenceState.supported.map((claim) => claim.claim)
        : investigation.evidenceState.known,
      disagreements: investigation.evidenceState.disagreements,
      unknowns: [
        ...new Set([
          ...investigation.knowledgeState.unsupported.map((claim) => claim.claim),
          ...(gap ? [gap.missingObservation] : []),
        ]),
      ],
      limitations: [
        ...new Set([
          ...investigation.evidenceState.limitations,
          ...investigation.knowledgeState.limitations,
          ...investigation.searches.zhihu.limitations,
          ...investigation.searches.global.limitations,
          ...investigation.discussionOrganizations.flatMap((item) => item.limitations),
          ...investigation.llmRuns.flatMap((run) => run.limitations),
        ]),
      ],
    },
    activeInvitation: gap
      ? investigation.missions.find(
          (mission) => mission.status === MISSION_STATUS.OPEN && mission.evidenceGapId === gap.id,
        )
      : undefined,
    impactReceipts: investigation.impactReceipts ?? [],
    synthesizedReport: investigation.synthesizedReport,
    updatedAt: investigation.updatedAt,
  });
}

export function projectDiscoveryTopic(investigation: Investigation): DiscoveryTopic {
  const view = projectKnowledgeObject(investigation);
  return DiscoveryTopicSchema.parse({
    id: view.id,
    title: view.question,
    summary: view.summary,
    sourceCount: view.sources.length,
    discussionCount: view.discussions.length,
    knowledgeState: view.knowledgeState.status,
    provenance: view.provenance.search,
    activeInvitation: view.activeInvitation,
    updatedAt: view.updatedAt,
  });
}
