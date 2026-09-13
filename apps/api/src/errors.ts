import type { ApiError, NormalizedSearchError, SearchErrorCode } from "@human-api/contracts";
import { LLMAdapterError } from "./llm/discussion-organizer.js";

const RETRYABLE_CODES = new Set<SearchErrorCode>([
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_RATE_LIMIT",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_ERROR",
]);

export class SearchAdapterError extends Error {
  readonly normalized: NormalizedSearchError;

  constructor(normalized: NormalizedSearchError) {
    super(normalized.message);
    this.name = "SearchAdapterError";
    this.normalized = normalized;
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiError["error"]["code"],
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function searchError(
  code: SearchErrorCode,
  message: string,
  upstreamCode?: string,
): SearchAdapterError {
  return new SearchAdapterError({
    code,
    message,
    retryable: RETRYABLE_CODES.has(code),
    ...(upstreamCode ? { upstreamCode } : {}),
  });
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof LLMAdapterError) {
    const map = {
      LLM_TIMEOUT: 504,
      LLM_RATE_LIMIT: 429,
      LLM_INVALID_RESPONSE: 502,
      LLM_UPSTREAM_UNAVAILABLE: 503,
      LLM_AUTH_REQUIRED: 401,
    } as const;
    return new HttpError(
      map[error.code],
      error.code === "LLM_AUTH_REQUIRED" ? "AUTH_REQUIRED" : error.code,
      error.message,
      error.code !== "LLM_INVALID_RESPONSE" && error.code !== "LLM_AUTH_REQUIRED",
    );
  }
  if (error instanceof SearchAdapterError) {
    const statusByCode: Partial<Record<SearchErrorCode, number>> = {
      AUTH_REQUIRED: 401,
      UPSTREAM_TIMEOUT: 504,
      UPSTREAM_RATE_LIMIT: 429,
      UPSTREAM_INVALID_RESPONSE: 502,
      UPSTREAM_UNAVAILABLE: 503,
      UPSTREAM_ERROR: 502,
    };
    return new HttpError(
      statusByCode[error.normalized.code] ?? 502,
      error.normalized.code === "AUTH_REQUIRED" ? "AUTH_REQUIRED" : error.normalized.code,
      error.normalized.message,
      error.normalized.retryable,
    );
  }
  return new HttpError(500, "INTERNAL_ERROR", "Unexpected server error.");
}
