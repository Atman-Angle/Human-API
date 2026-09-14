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
  MissionInvitationListSchema,
  MissionDetailSchema,
  type MissionDetail,
  AuthSessionSchema,
  type AuthSession,
  ZhihuFolloweesResponseSchema,
  ZhihuCreatedContentsResponseSchema,
  type ZhihuFolloweesResponse,
  type ZhihuCreatedContentsResponse,
  ChatRouteResponseSchema,
  type ChatRouteRequest,
  type ChatRouteResponse,
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

export async function chatRoute(
  message: string,
  investigationId?: string,
): Promise<ChatRouteResponse> {
  const body: ChatRouteRequest = investigationId ? { message, investigationId } : { message };
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/chat/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError("无法连接求证服务，请确认后端已启动。", "UPSTREAM_UNAVAILABLE", true);
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(data);
    if (parsed.success) {
      throw new ApiClientError(
        parsed.data.error.message,
        parsed.data.error.code,
        parsed.data.error.retryable,
      );
    }
    throw new ApiClientError(`请求失败（HTTP ${response.status}）`);
  }
  const parsed = ChatRouteResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  }
  return parsed.data;
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
    credentials: "include",
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

export async function getMission(missionId: string): Promise<MissionDetail> {
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
  const parsed = MissionDetailSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiClientError("服务返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  return parsed.data;
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
      credentials: "include",
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

export const dispatchMissionInvitations = (missionId: string) =>
  requestCommunity(
    `/api/missions/${encodeURIComponent(missionId)}/invitations`,
    MissionInvitationListSchema,
  );
export const runInvestigationMaintenance = (id: string) =>
  requestCommunity(
    `/api/investigations/${encodeURIComponent(id)}/maintenance`,
    InvestigationResponseSchema,
  );
export const getHotList = (limit = 10): Promise<HotListResponse> =>
  requestCommunity(`/api/discovery/hot-list?limit=${limit}`, HotListResponseSchema);

export const getZhihuFollowees = (offset = "0", limit = 20): Promise<ZhihuFolloweesResponse> =>
  requestCommunity(
    `/api/auth/zhihu/followees?offset=${encodeURIComponent(offset)}&limit=${limit}`,
    ZhihuFolloweesResponseSchema,
  );

export const getZhihuCreatedContents = (
  offset = "0",
  limit = 20,
): Promise<ZhihuCreatedContentsResponse> =>
  requestCommunity(
    `/api/auth/zhihu/contents?offset=${encodeURIComponent(offset)}&limit=${limit}`,
    ZhihuCreatedContentsResponseSchema,
  );

// --- Zhihu OAuth ---
export interface ZhihuAuthUrlResponse {
  url: string;
  state: string;
}

export interface ZhihuCallbackRequest {
  code: string;
  state?: string;
}

export async function getZhihuAuthUrl(redirectUri?: string): Promise<ZhihuAuthUrlResponse> {
  const params = redirectUri ? "?redirect_uri=" + encodeURIComponent(redirectUri) : "";
  const response = await fetch(API_BASE_URL + "/api/auth/zhihu/url" + params, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new ApiClientError("获取知乎授权地址失败", "UPSTREAM_UNAVAILABLE", true);
  return response.json() as Promise<ZhihuAuthUrlResponse>;
}

export async function postZhihuCallback(input: ZhihuCallbackRequest): Promise<AuthSession> {
  const response = await fetch(API_BASE_URL + "/api/auth/zhihu/callback", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = body as { message?: unknown; error?: { message?: unknown } } | null;
    throw new ApiClientError(
      String(err?.error?.message ?? err?.message ?? "知乎登录失败"),
      "UPSTREAM_UNAVAILABLE",
      true,
    );
  }
  const parsed = AuthSessionSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiClientError("登录返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  return parsed.data;
}

export async function getZhihuMe(): Promise<AuthSession> {
  const response = await fetch(API_BASE_URL + "/api/auth/zhihu/me", {
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    if (parsed.success) throw new ApiClientError(parsed.data.error.message, parsed.data.error.code);
    throw new ApiClientError("当前未登录", "AUTH_REQUIRED");
  }
  const parsed = AuthSessionSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiClientError("登录状态返回的数据结构不符合当前 Contract。", "INVALID_RESPONSE");
  return parsed.data;
}

export async function logoutZhihu(): Promise<void> {
  await fetch(API_BASE_URL + "/api/auth/zhihu/logout", {
    method: "POST",
    credentials: "include",
  });
}

// --- Zhihu Community ---
export interface ZhihuPublishRequest {
  ring_id: string;
  title?: string;
  content: string;
  image_urls?: string[];
}

export function getZhihuRing(ringId: string): Promise<unknown> {
  return fetch(API_BASE_URL + "/api/zhihu/ring?ring_id=" + encodeURIComponent(ringId)).then((r) => {
    if (!r.ok) throw new ApiClientError("获取圈子详情失败", "UPSTREAM_UNAVAILABLE", true);
    return r.json();
  });
}

export function postZhihuPublish(input: ZhihuPublishRequest): Promise<unknown> {
  return fetch(API_BASE_URL + "/api/zhihu/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => {
    if (!r.ok) throw new ApiClientError("发布想法失败", "UPSTREAM_UNAVAILABLE", true);
    return r.json();
  });
}

export function getZhihuComments(
  contentToken: string,
  contentType: "pin" | "comment" = "pin",
): Promise<unknown> {
  return fetch(
    API_BASE_URL +
      "/api/zhihu/comments?content_token=" +
      encodeURIComponent(contentToken) +
      "&content_type=" +
      contentType,
  ).then((r) => {
    if (!r.ok) throw new ApiClientError("获取评论列表失败", "UPSTREAM_UNAVAILABLE", true);
    return r.json();
  });
}

export function postZhihuComment(input: {
  content_token: string;
  content_type: "pin" | "comment";
  content: string;
}): Promise<unknown> {
  return fetch(API_BASE_URL + "/api/zhihu/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => {
    if (!r.ok) throw new ApiClientError("创建评论失败", "UPSTREAM_UNAVAILABLE", true);
    return r.json();
  });
}
