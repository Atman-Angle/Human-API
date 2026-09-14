"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postZhihuCallback } from "@/lib/api-client";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("Processing authorization...");
  const [user, setUser] = useState<{ fullname: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const code = searchParams.get("code") || searchParams.get("authorization_code");
  const state = searchParams.get("state");

  useEffect(() => {
    if (!code) return;
    postZhihuCallback(state ? { code, state } : { code })
      .then((result) => {
        setUser({ fullname: result.user.fullname });
        setStatus("登录成功，正在返回…");
        window.setTimeout(() => router.push("/"), 700);
      })
      .catch((err: Error) => {
        setError(err.message);
        setStatus("Authorization failed");
      });
  }, [code, state, router]);

  const displayError = error || (!code ? "Missing authorization_code" : null);

  return (
    <div>
      {displayError && (
        <div
          style={{
            padding: 12,
            background: "#fef2f2",
            borderRadius: 8,
            color: "#dc2626",
            marginBottom: 16,
          }}
        >
          {displayError}
        </div>
      )}
      <p>{status}</p>
      {user && (
        <div style={{ marginTop: 16, padding: 16, background: "#f0fdf4", borderRadius: 8 }}>
          <p>Welcome, {user.fullname}</p>
          <button
            onClick={() => router.push("/")}
            style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}
          >
            Back to Home
          </button>
        </div>
      )}
      {!user && !displayError && <p style={{ color: "#666" }}>Communicating with Zhihu...</p>}
    </div>
  );
}

export default function ZhihuCallbackPage() {
  return (
    <main
      style={{
        maxWidth: 540,
        margin: "80px auto",
        padding: "0 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Zhihu OAuth</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <CallbackInner />
      </Suspense>
    </main>
  );
}
