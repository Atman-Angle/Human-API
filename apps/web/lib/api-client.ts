import {
  ApiErrorSchema,
  EvidenceRecordSchema,
  ImpactReceiptSchema,
  InvestigationListItemSchema,
  InvestigationResponseSchema,
  type EvidenceSubmission,
  type EvidenceRecord,
  type ImpactReceipt,
  type InvestigationListItem,
  type Investigation,
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
