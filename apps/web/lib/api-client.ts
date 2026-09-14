import {
  ApiErrorSchema,
  DiscoveryTopicsResponseSchema,
  HotListResponseSchema,
  type HotListResponse,
  KnowledgeObjectProjectionSchema,
  ConversationDraftSchema,
  EvidenceIntakeResponseSchema,
  type ConfirmObservationRequest,
  EvidenceRecordSchema,
  ImpactReceiptSchema,
  InvestigationListItemSchema,
  MissionListItemSchema,
  DiscussionOrganizationSchema,
  InvestigationResponseSchema,
  type EvidenceSubmission,
  type EvidenceRecord,
  type ImpactReceipt,
  type InvestigationListItem,
  type Investigation,
  type MissionListItem,
  type DiscussionInput,
  type DiscussionOrganization,
} from "@human-api/contracts";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export class ApiClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly requestId?: string;

  constructor(message: string, code = "INTERNAL_ERROR", retryable = false, requestId?: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

async function requestInvestigation(path: string, init?: RequestInit): Promise<Investigation> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError("无法连接求证服务，请确认后端已启动。", "UPSTREAM_UNAVAILABLE", true);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }

    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }

  const parsed = InvestigationResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }

  return parsed.data;
}

export function createInvestigation(question: string): Promise<Investigation> {
  return requestInvestigation("/api/investigations", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function getInvestigation(investigationId: string): Promise<Investigation> {
  return requestInvestigation(`/api/investigations/${encodeURIComponent(investigationId)}`);
}

export async function listInvestigations(): Promise<InvestigationListItem[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/investigations`, { cache: "no-store" });
  } catch {
    throw new ApiClientError("无法连接求证服务，请确认后端已启动。", "UPSTREAM_UNAVAILABLE", true);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }
  if (!Array.isArray(body)) {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }
  const parsed = body.map((item) => InvestigationListItemSchema.safeParse(item));
  if (parsed.some((item) => !item.success)) {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }
  return parsed.map((item) => item.data) as InvestigationListItem[];
}

export async function listMissions(status: "OPEN" | "CLOSED" = "OPEN"): Promise<MissionListItem[]> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/missions?status=${status}`, { cache: "no-store" });
  } catch {
    throw new ApiClientError("无法连接求证服务，请确认后端已启动。", "UPSTREAM_UNAVAILABLE", true);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }
  if (!Array.isArray(body))
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  const parsed = body.map((item) => MissionListItemSchema.safeParse(item));
  if (parsed.some((item) => !item.success))
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  return parsed.map((item) => item.data) as MissionListItem[];
}

export async function organizeDiscussion(input: DiscussionInput): Promise<DiscussionOrganization> {
  const response = await fetch(`${API_BASE_URL}/api/discussions/organize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }
  const parsed = DiscussionOrganizationSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  return parsed.data;
}

export async function getMission(missionId: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/missions/${encodeURIComponent(missionId)}`, {
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }
  return body;
}

export function createMission(investigationId: string, gapId?: string): Promise<Investigation> {
  return requestInvestigation(
    `/api/investigations/${encodeURIComponent(investigationId)}/missions`,
    {
      method: "POST",
      body: JSON.stringify(gapId ? { gapId } : {}),
    },
  );
}

export function submitEvidence(
  missionId: string,
  submission: EvidenceSubmission,
): Promise<{ record: EvidenceRecord; receipt: ImpactReceipt; investigation: Investigation }> {
  return requestEvidenceResult(`/api/missions/${encodeURIComponent(missionId)}/evidence`, {
    method: "POST",
    body: JSON.stringify(submission),
  });
}

async function requestEvidenceResult(
  path: string,
  init: RequestInit,
): Promise<{ record: EvidenceRecord; receipt: ImpactReceipt; investigation: Investigation }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new ApiClientError("无法连接求证服务，请确认后端已启动。", "UPSTREAM_UNAVAILABLE", true);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = ApiErrorSchema.safeParse(body);
    if (parsedError.success) {
      const { code, message, retryable, requestId } = parsedError.data.error;
      throw new ApiClientError(message, code, retryable, requestId);
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }

  if (!body || typeof body !== "object") {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }

  const result = body as Record<string, unknown>;
  const record = EvidenceRecordSchema.safeParse(result.record);
  const receipt = ImpactReceiptSchema.safeParse(result.receipt);
  const investigation = InvestigationResponseSchema.safeParse(result.investigation);
  if (!record.success || !receipt.success || !investigation.success) {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }

  return { record: record.data, receipt: receipt.data, investigation: investigation.data };
}

// Validated read/preparation endpoints: no client-side domain projections.
async function requestCommunity<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new ApiClientError(
      "暂时无法连接服务。请确认 API 已启动，再重试；你的输入仍保留在此页。",
      "UPSTREAM_UNAVAILABLE",
      true,
    );
  }
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(result);
    if (parsed.success)
      throw new ApiClientError(
        parsed.data.error.message,
        parsed.data.error.code,
        parsed.data.error.retryable,
        parsed.data.error.requestId,
      );
    throw new ApiClientError(`请求未完成（HTTP ${response.status}），请稍后重试。`);
  }
  try {
    return schema.parse(result);
  } catch {
    throw new ApiClientError("服务返回的内容格式不正确，请刷新后重试。", "INVALID_RESPONSE");
  }
}
export const prepareGoldenDemo = () =>
  requestCommunity("/api/demo/prepare", InvestigationResponseSchema, {});
export const getDiscoveryTopics = () =>
  requestCommunity("/api/discovery/topics", DiscoveryTopicsResponseSchema);
export const getKnowledgeObject = (id: string) =>
  requestCommunity(
    `/api/knowledge-objects/${encodeURIComponent(id)}`,
    KnowledgeObjectProjectionSchema,
  );
export const prepareConversationDraft = (id: string, answers: string[]) =>
  requestCommunity(
    `/api/missions/${encodeURIComponent(id)}/conversation`,
    ConversationDraftSchema,
    { answers },
  );
export const confirmObservation = (id: string, input: ConfirmObservationRequest) =>
  requestCommunity(
    `/api/missions/${encodeURIComponent(id)}/conversation/confirm`,
    EvidenceIntakeResponseSchema,
    input,
  );

export const getHotList = (limit = 10): Promise<HotListResponse> =>
  requestCommunity(`/api/discovery/hot-list?limit=${limit}`, HotListResponseSchema);
