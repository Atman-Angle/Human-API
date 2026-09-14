const TOKEN_ENDPOINT = "https://openapi.zhihu.com/access_token";
const USER_ENDPOINT = "https://openapi.zhihu.com/user";

export interface ZhihuTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ZhihuUserResponse {
  uid: number;
  hash_id?: string;
  fullname: string;
  gender: "male" | "female" | "unknown";
  headline?: string;
  description?: string;
  avatar_path?: string;
  url?: string;
  email?: string;
  phone_no?: string;
}

export function buildAuthorizeUrl(appId: string, redirectUri: string, state: string): string {
  const url =
    "https://openapi.zhihu.com/authorize?" +
    new URLSearchParams({
      redirect_uri: redirectUri,
      app_id: appId,
      response_type: "code",
      state,
    }).toString();
  return url;
}

export async function exchangeCodeForToken(
  appId: string,
  appKey: string,
  redirectUri: string,
  code: string,
  abortSignal: AbortSignal | null = null,
): Promise<ZhihuTokenResponse> {
  const body = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  }).toString();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: abortSignal,
  });
  const text = await response.text();
  const json = JSON.parse(text) as Record<string, unknown>;
  if (typeof json.code === "number" && json.code !== 0)
    throw new Error(
      "Zhihu OAuth error (" + json.code + "): " + ((json.data as string) ?? "unknown"),
    );
  if (!response.ok) throw new Error("Zhihu OAuth HTTP " + response.status);
  const result = {
    access_token: json.access_token as string,
    token_type: json.token_type as string,
    expires_in: json.expires_in as number,
  };
  if (!result.access_token) throw new Error("Zhihu OAuth response missing access_token");
  return result;
}

export async function getUserInfo(
  accessToken: string,
  abortSignal: AbortSignal | null = null,
): Promise<ZhihuUserResponse> {
  const response = await fetch(USER_ENDPOINT, {
    headers: { Authorization: "Bearer " + accessToken },
    signal: abortSignal,
  });
  const text = await response.text();
  const json = JSON.parse(text) as Record<string, unknown>;
  if (typeof json.code === "number" && json.code !== 0)
    throw new Error("Zhihu API error (" + json.code + "): " + ((json.data as string) ?? "unknown"));
  if (!response.ok) throw new Error("Zhihu user info HTTP " + response.status);
  const result: ZhihuUserResponse = {
    uid: json.uid as number,
    fullname: json.fullname as string,
    gender: json.gender as "male" | "female" | "unknown",
  };
  if (!result.uid) throw new Error("Zhihu user info response missing uid");
  return result;
}
