"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, ExternalLink, LoaderCircle } from "lucide-react";
import type {
  EvidenceIntakeResponse,
  ImpactReceipt,
  KnowledgeObjectProjection,
} from "@human-api/contracts";
import { getKnowledgeObject } from "@/lib/api-client";
import {
  CommunityHeader,
  ConversationDrawer,
  Receipt,
  SourceMode,
  Understanding,
  errorMessage,
  knowledgeLabels,
} from "@/app/community-ui";

export default function InvestigationClient({ investigationId }: { investigationId: string }) {
  const [view, setView] = useState<KnowledgeObjectProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [receipt, setReceipt] = useState<ImpactReceipt | null>(null);
  const [receiptDemo, setReceiptDemo] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getKnowledgeObject(investigationId)
      .then((result) => {
        if (!cancelled) {
          setView(result);
          setReceipt(result.impactReceipts.at(-1) ?? null);
          setReceiptDemo(
            Boolean(
              result.evidence.find(
                (record) => record.id === result.impactReceipts.at(-1)?.evidenceId,
              )?.submission.demoSample,
            ),
          );
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [investigationId, attempt]);
  function complete(result: EvidenceIntakeResponse) {
    setJoining(false);
    setReceipt(result.receipt);
    setReceiptDemo(Boolean(result.record.submission.demoSample));
    setAttempt((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const invitationGap = view?.evidenceGaps.find(
    (gap) => gap.id === view.activeInvitation?.evidenceGapId,
  );
  return (
    <div className="app-shell">
      <CommunityHeader />
      <main className="hg-page hg-detail">
        <Link href="/" className="hg-back">
          ← 返回 Agent 发现
        </Link>
        {error && (
          <div className="hg-error" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
            >
              重试
            </button>
          </div>
        )}
        {!view && !error && (
          <div className="hg-loading">
            <LoaderCircle className="spin" />
            正在读取公开讨论与知识边界…
          </div>
        )}
        {view && (
          <>
            <header className="hg-detail-header">
              <span className="hg-eyebrow">AI CODING · 持续共同理解的问题</span>
              <h1>{view.question}</h1>
              <p>{knowledgeLabels[view.knowledgeState.status]}。公开讨论是起点，不是最终答案。</p>
              <div className="hg-source-row">
                <span>知乎：</span>
                <SourceMode mode={view.provenance.search.zhihu} />
                <span>全网：</span>
                <SourceMode mode={view.provenance.search.global} />
              </div>
            </header>
            {receipt && <Receipt receipt={receipt} demoSample={receiptDemo} />}
            <section className="hg-discussions">
              <div className="hg-section-heading">
                <h2>先听听人们怎么说</h2>
                <span>{view.sources.length} 条公开来源 · 以下是原始内容摘录，不代表平台认同</span>
              </div>
              {view.sources.slice(0, 3).map((source) => (
                <article className="hg-source" key={`${source.provider}:${source.contentId}`}>
                  <div className="hg-author">
                    <span className="hg-avatar">{(source.authorName ?? "公").slice(0, 1)}</span>
                    <div>
                      <strong>{source.authorName || "公开来源"}</strong>
                      <small>
                        {source.provider === "ZHIHU" ? "知乎公开内容" : "全网公开内容"} ·{" "}
                        {source.publishedAt
                          ? new Date(source.publishedAt).toLocaleDateString("zh-CN")
                          : "时间未提供"}
                      </small>
                    </div>
                  </div>
                  <h3>{source.title}</h3>
                  <p className="hg-excerpt">{source.excerpt}</p>
                  <a className="hg-source-link" href={source.url} target="_blank" rel="noreferrer">
                    查看原始来源 <ExternalLink size={13} />
                  </a>
                </article>
              ))}
              {view.sources.length > 3 && (
                <details className="hg-more-sources">
                  <summary>查看另外 {view.sources.length - 3} 条来源</summary>
                  {view.sources.slice(3).map((source) => (
                    <p key={`${source.provider}:${source.contentId}`}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title} ↗
                      </a>
                    </p>
                  ))}
                </details>
              )}
              {view.discussions.map((discussion) => (
                <article className="hg-source" key={discussion.id}>
                  <strong>{discussion.authorLabel ?? "参与者"}</strong>
                  <p>{discussion.content}</p>
                  <small>用户提交的讨论 · 尚不等于已采纳证据</small>
                </article>
              ))}
              {!view.sources.length && !view.discussions.length && (
                <p>当前尚未获得可展示的公开讨论，不编造社区声音。</p>
              )}
            </section>
            <section className="hg-agent-organization">
              <div className="hg-section-heading">
                <h2>
                  <Bot size={21} /> Agent 把讨论整理成了这些
                </h2>
                <span>规则整理 · 不是实时 LLM 声明</span>
              </div>
              <Understanding summary={view.summary} />
              <h3>这些判断依据什么？</h3>
              <p className="hg-note">
                以下是服务端已有判断与引用，不是前端新生成的结论。引用相关不等于原文已证明判断。
              </p>
              {view.claims.map((claim) => (
                <article className="hg-source" key={claim.id}>
                  <p>
                    <strong>{claim.claim}</strong>
                  </p>
                  <p>{claim.rationale}</p>
                  <details>
                    <summary>查看对应公开来源与已记录经历</summary>
                    {view.sources
                      .filter((source) => claim.sourceRefIds.includes(source.id))
                      .map((source) => (
                        <div key={source.id}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title || "查看原始来源"}
                          </a>
                          <blockquote>{source.excerpt}</blockquote>
                        </div>
                      ))}
                    {view.evidence
                      .filter((record) => claim.evidenceIds.includes(record.id))
                      .map((record) => (
                        <blockquote key={record.id}>
                          {record.submission.demoSample
                            ? "合成演示经历："
                            : "用户确认、未经独立核验："}
                          {record.submission.statement}
                        </blockquote>
                      ))}
                    {!claim.sourceRefIds.length && !claim.evidenceIds.length && (
                      <p>当前没有可追溯引用，不把这条判断当作已证实事实。</p>
                    )}
                  </details>
                </article>
              ))}
              <details className="hg-boundaries">
                <summary>这些理解有什么边界？</summary>
                <ul>
                  {view.summary.limitations.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </details>
            </section>
            <section className="hg-invitation">
              <span className="hg-eyebrow">一份面向亲历者的邀请</span>
              <h2>只说你经历过的一次，不必代表所有人。</h2>
              <p>
                {view.activeInvitation?.description ??
                  "当前没有可提交的开放邀请。你仍然可以查看已有讨论和贡献。"}
              </p>
              {invitationGap && (
                <div>
                  <h3>为什么需要你的经历？</h3>
                  <p>{invitationGap.whyUnresolved}</p>
                  <p>
                    <strong>想补上的具体信息：</strong>
                    {invitationGap.missingObservation}
                  </p>
                  <p className="hg-note">{invitationGap.expectedValue}</p>
                </div>
              )}
              {view.activeInvitation && (
                <>
                  <p className="hg-note">
                    适合：{view.activeInvitation.qualification.join("、")}
                    。支持、反例、没变化都欢迎。
                  </p>
                  <button className="primary-button" type="button" onClick={() => setJoining(true)}>
                    分享我的经历 <ArrowRight size={17} />
                  </button>
                  <small>自然对话 → 确认摘要 → 服务端评估 → 贡献回执</small>
                </>
              )}
            </section>
            {view.evidence.length > 0 && (
              <section className="hg-evidence" id="community-contributions">
                <h2>共同理解留下了哪些新依据</h2>
                <p className="hg-note">
                  这里记录每次贡献的处理结果，不把新增记录等同于新的共识。用户确认不等于独立核验。
                </p>
                {view.evidence.map((record) => (
                  <article key={record.id} className="hg-source">
                    <span className="hg-eyebrow">
                      {record.submission.demoSample
                        ? "GOLDEN_FIXTURE · 合成演示示例"
                        : "用户确认的经历 · 非独立核验"}
                    </span>
                    <p>{record.submission.statement}</p>
                    {view.impactReceipts.find((item) => item.evidenceId === record.id)
                      ?.contribution && (
                      <p>
                        {
                          view.impactReceipts.find((item) => item.evidenceId === record.id)
                            ?.contribution?.explanation
                        }
                      </p>
                    )}
                    <small>
                      {view.impactReceipts.find((item) => item.evidenceId === record.id)?.accepted
                        ? "已纳入本次缺口的证据"
                        : "暂未纳入证据"}
                    </small>
                  </article>
                ))}
              </section>
            )}
            <details className="hg-technical">
              <summary>技术与审计详情：Claims、Evidence、来源与评估</summary>
              <pre>{JSON.stringify(view, null, 2)}</pre>
            </details>
            <footer className="hg-footer">
              刷新读取 API
              持久化保存的状态、证据与回执。若服务端存储不可用，页面会显示真实读取失败。
              <br />
              最后更新：{new Date(view.updatedAt).toLocaleString("zh-CN")}
            </footer>
            {joining && view.activeInvitation && (
              <ConversationDrawer
                mission={view.activeInvitation}
                onClose={() => setJoining(false)}
                onComplete={complete}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
