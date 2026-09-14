import { createHmac, randomUUID } from "node:crypto";

export class ZhihuCommunityAdapter {
  constructor(
    private readonly appKey: string,
    private readonly appSecret: string,
    private readonly baseUrl = "https://openapi.zhihu.com",
  ) {}

  private headers(): Record<string, string> {
    const ts = Math.floor(Date.now() / 1000).toString();
    const logId = randomUUID();
    const extra = "";
    const signStr =
      "app_key:" + this.appKey + "|ts:" + ts + "|logid:" + logId + "|extra_info:" + extra;
    const sign = createHmac("sha256", this.appSecret).update(signStr).digest("base64");
    return {
      "X-App-Key": this.appKey,
      "X-Timestamp": ts,
      "X-Log-Id": logId,
      "X-Sign": sign,
      "X-Extra-Info": extra,
    };
  }

  private async call(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers: Record<string, string> = {
      ...this.headers(),
      "Content-Type": "application/json",
    };
    if (init.headers) {
      Object.assign(headers, init.headers);
    }
    const response = await fetch(this.baseUrl + path, { ...init, headers });
    const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || body?.status === 1 || body?.code === 1) {
      throw new Error(
        (body?.msg as string) ??
          (body?.data as string) ??
          "Zhihu community API HTTP " + response.status,
      );
    }
    return body;
  }

  ringDetail(ringId: string): Promise<unknown> {
    return this.call(
      "/openapi/ring/detail?ring_id=" + encodeURIComponent(ringId) + "&page_num=1&page_size=20",
    );
  }

  publishPin(input: {
    ring_id: string;
    title?: string;
    content: string;
    image_urls?: string[];
  }): Promise<unknown> {
    return this.call("/openapi/publish/pin", { method: "POST", body: JSON.stringify(input) });
  }

  listComments(contentToken: string, contentType: "pin" | "comment" = "pin"): Promise<unknown> {
    return this.call(
      "/openapi/comment/list?content_token=" +
        encodeURIComponent(contentToken) +
        "&content_type=" +
        contentType +
        "&page_num=0&page_size=10",
    );
  }

  createComment(input: {
    content_token: string;
    content_type: "pin" | "comment";
    content: string;
  }): Promise<unknown> {
    return this.call("/openapi/comment/create", { method: "POST", body: JSON.stringify(input) });
  }
}
