import { notFound } from "next/navigation";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
type JsonRecord = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown): JsonRecord[] =>
  Array.isArray(v) ? v.filter((x): x is JsonRecord => !!x && typeof x === "object") : [];
export default async function KnowledgeObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/api/knowledge-objects/${encodeURIComponent(id)}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) notFound();
  const object = (await response.json()) as JsonRecord;
  const state = (object.knowledgeState as JsonRecord | undefined) ?? {};
  const claims = list(object.claims),
    gaps = list(object.evidenceGaps);
  return (
    <main className="knowledge-object-page">
      <a className="back-link" href={`/investigation/${encodeURIComponent(id)}`}>
        ← 返回 Investigation
      </a>
      <header className="knowledge-object-header">
        <span className="eyebrow">KNOWLEDGE OBJECT · 服务端投影</span>
        <h1>{text(object.question) || "未命名 Knowledge Object"}</h1>
        <p>这是面向用户的持续演化知识对象，数据来自服务端投影，不是静态文章。</p>
        <div className="knowledge-state-card">
          <strong>{text(state.status) || "未知状态"}</strong>
          <span>
            {text(state.updatedAt)
              ? `更新于 ${new Date(text(state.updatedAt)).toLocaleString("zh-CN")}`
              : "暂无更新时间"}
          </span>
        </div>
      </header>
      <section className="knowledge-object-grid">
        <article className="surface-card">
          <h2>Claims</h2>
          {claims.length ? (
            <ul>
              {claims.map((c, i) => (
                <li key={text(c.id) || i}>
                  <strong>{text(c.claim)}</strong>
                  {text(c.rationale) && <p>{text(c.rationale)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">暂无 Claim。</p>
          )}
        </article>
        <article className="surface-card">
          <h2>Evidence Gaps</h2>
          {gaps.length ? (
            <ul>
              {gaps.map((g, i) => (
                <li key={`${text(g.id)}-${i}`}>
                  <strong>{text(g.missingObservation) || text(g.claim)}</strong>
                  {text(g.expectedValue) && <p>{text(g.expectedValue)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">当前没有开放缺口。</p>
          )}
        </article>
      </section>
    </main>
  );
}
