"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  LogIn,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import type {
  ChatRouteResponse,
  EvidenceIntakeResponse,
  KnowledgeObjectProjection,
} from "@human-api/contracts";
import {
  chatRoute,
  getKnowledgeObject,
  getZhihuAuthUrl,
  getZhihuMe,
  organizeDiscussion,
} from "@/lib/api-client";
import {
  CommunityHeader,
  ConversationDrawer,
  SourceMode,
  errorMessage,
  knowledgeLabels,
} from "@/app/community-ui";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

export default function InvestigationClient({ investigationId }: { investigationId: string }) {
  const [view, setView] = useState<KnowledgeObjectProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ uid: number; fullname: string } | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getZhihuMe()
      .then((session) => setCurrentUser({ uid: session.user.uid, fullname: session.user.fullname }))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getKnowledgeObject(investigationId)
      .then((result) => {
        if (!cancelled) {
          setView(result);
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

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  function complete(result: EvidenceIntakeResponse) {
    setJoining(false);
    setAttempt((v) => v + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const invitationGap = view?.evidenceGaps.find(
    (gap) => gap.id === view.activeInvitation?.evidenceGapId,
  );
  const communityDiscussions =
    view?.discussions.filter((d) => d.source !== "INITIAL_ARTICLE_GENERATION") ?? [];

  const sources = view?.sources ?? [];
  const visibleSources = sourcesExpanded ? sources : sources.slice(0, 10);

  async function startLogin() {
    setAuthBusy(true);
    try {
      const result = await getZhihuAuthUrl(`${window.location.origin}/auth/zhihu/callback`);
      window.location.assign(result.url);
    } catch (e) {
      setAgentReply(errorMessage(e));
      setAuthBusy(false);
    }
  }

  async function handleDiscussionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || replying || !currentUser) return;
    setReplying(true);
    try {
      await organizeDiscussion({
        id: "disc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        content: reply.trim(),
        investigationId,
        authorId: String(currentUser.uid),
        authorLabel: currentUser.fullname,
        source: "DISCUSSION",
        createdAt: new Date().toISOString(),
      });
      setAgentReply("你的讨论已收到。Agent 会关注其中有价值的经历。");
      setReply("");
      setAttempt((v) => v + 1);
    } catch (e2) {
      setAgentReply(errorMessage(e2));
    } finally {
      setReplying(false);
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const result: ChatRouteResponse = await chatRoute(msg, investigationId);
      const answer = "answer" in result ? result.answer : "暂时没有更多信息。";
      setChatMessages((prev) => [...prev, { role: "agent", content: answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "agent", content: "暂时无法回答，请稍后再试。" },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <CommunityHeader />
      <div className="hg-layout">
        <main className="hg-main-content">
          <Link href="/" className="hg-back">
            ← 返回
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
              加载中…
            </div>
          )}
          {view && (
            <>
              <header className="hg-detail-header">
                <span className="hg-eyebrow">正在探索的问题</span>
                <h1>{view.question}</h1>
                <p>{knowledgeLabels[view.knowledgeState.status]}</p>
                <div className="hg-article-stats">
                  <span>来源 {sources.length}</span>
                  <span>经历 {view.evidence.length}</span>
                  <span>讨论 {communityDiscussions.length}</span>
                </div>
                <div className="hg-source-row">
                  <span>知乎：</span>
                  <SourceMode mode={view.provenance.search.zhihu} />
                  <span>全网：</span>
                  <SourceMode mode={view.provenance.search.global} />
                </div>
              </header>

              <article className="hg-knowledge-article">
                <div className="hg-article-kicker">
                  <Bot size={15} /> 来自公开来源 ·{" "}
                  {new Date(view.updatedAt).toLocaleString("zh-CN")} 更新
                </div>

                {view.synthesizedReport && (
                  <div className="hg-article-report">
                    <div className="hg-report-content">
                      {view.synthesizedReport.split("\n").map((line, i) => {
                        if (line.startsWith("### ")) {
                          return (
                            <h3 key={i} className="hg-report-h3">
                              {line.slice(4)}
                            </h3>
                          );
                        }
                        if (line.startsWith("## ")) {
                          return (
                            <h2 key={i} className="hg-report-h2">
                              {line.slice(3)}
                            </h2>
                          );
                        }
                        if (line.startsWith("---")) {
                          return <hr key={i} className="hg-report-hr" />;
                        }
                        if (line.startsWith("*") && line.endsWith("*")) {
                          return (
                            <p key={i} className="hg-report-note">
                              {line.slice(1, -1)}
                            </p>
                          );
                        }
                        if (line.trim() === "") {
                          return <br key={i} />;
                        }
                        return (
                          <p key={i} className="hg-report-p">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="hg-article-body">
                  {sources.length > 0 ? (
                    <details className="hg-source-details">
                      <summary className="hg-source-summary">
                        查看 {sources.length} 个来源详情
                      </summary>
                      <div className="hg-source-articles">
                        {sources.map((source) => (
                          <section key={source.id} className="hg-source-card">
                            <div className="hg-source-card-header">
                              <span className="hg-source-badge">
                                {source.provider === "ZHIHU" ? "知乎帖子" : "全网来源"}
                              </span>
                              <h3>{source.title}</h3>
                            </div>
                            {source.authorName && (
                              <div className="hg-source-author">
                                <span className="hg-avatar-mini">
                                  {(source.authorName ?? "?").slice(0, 1)}
                                </span>
                                <span>{source.authorName}</span>
                              </div>
                            )}
                            <p className="hg-source-excerpt">
                              {source.llmSummary ?? source.excerpt}
                            </p>
                            <a
                              className="hg-source-link"
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              查看原文 <ExternalLink size={13} />
                            </a>
                          </section>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <p>当前尚未获得可展示的公开来源。</p>
                  )}
                </div>
              </article>

              {/* 边界：还需要推进什么 */}
              <section className="hg-boundaries-section">
                <div className="hg-boundaries-header">
                  <Bot size={18} />
                  <h2>还需要推进的边界</h2>
                </div>
                <p className="hg-note">
                  以下内容来自 Agent 对现有公开讨论的分析，指出了理解上仍未被充分解答的缺口。
                </p>

                {view.summary.unknowns.length > 0 && (
                  <div className="hg-boundary-block">
                    <h3>尚未明确的问题</h3>
                    <ul>
                      {view.summary.unknowns.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {view.evidenceGaps.length > 0 && (
                  <div className="hg-boundary-block">
                    <h3>证据缺口</h3>
                    {view.evidenceGaps.map((gap) => (
                      <div key={gap.id} className="hg-gap-card">
                        <p className="hg-gap-question">
                          <strong>缺口：</strong>
                          {gap.claim}
                        </p>
                        <p className="hg-gap-why">{gap.whyUnresolved}</p>
                        <p className="hg-gap-need">
                          <strong>需要补充：</strong>
                          {gap.missingObservation}
                        </p>
                        {gap.expectedValue && <p className="hg-note">{gap.expectedValue}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {view.summary.disagreements.length > 0 && (
                  <div className="hg-boundary-block">
                    <h3>仍存在分歧</h3>
                    {view.summary.disagreements.map((item, i) => (
                      <p key={i}>{item}</p>
                    ))}
                  </div>
                )}

                {view.summary.limitations.length > 0 && (
                  <div className="hg-boundary-block">
                    <h3>当前理解的局限</h3>
                    <ul>
                      {view.summary.limitations.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {view.activeInvitation && (
                  <div className="hg-boundary-invite">
                    <p>
                      <strong>你可以参与推进：</strong>
                      {view.activeInvitation.description}
                    </p>
                    {invitationGap && (
                      <p className="hg-note">
                        <strong>想补上的具体信息：</strong>
                        {invitationGap.missingObservation}
                      </p>
                    )}
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => setJoining(true)}
                    >
                      分享我的经历 <ArrowRight size={17} />
                    </button>
                  </div>
                )}
              </section>

              <section className="hg-discussions">
                <h2 className="hg-section-title">
                  <MessageCircle size={18} />
                  大家的讨论
                </h2>
                {!currentUser ? (
                  <div className="hg-login-prompt">
                    <LogIn size={16} />
                    <span>
                      <button
                        className="link-button"
                        type="button"
                        onClick={startLogin}
                        disabled={authBusy}
                      >
                        登录知乎
                      </button>
                      ，参与讨论
                    </span>
                  </div>
                ) : (
                  <form className="hg-reply-form" onSubmit={handleDiscussionSubmit}>
                    <MessageCircle size={20} />
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="说说你的经历或看法…"
                      maxLength={6000}
                      disabled={replying}
                    />
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!reply.trim() || replying}
                    >
                      {replying ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}
                      发送
                    </button>
                  </form>
                )}
                {agentReply && (
                  <div className="hg-thread-message agent-message">
                    <Bot size={16} />
                    <p>{agentReply}</p>
                  </div>
                )}
                {communityDiscussions.length > 0 ? (
                  <div className="hg-discussion-list">
                    {communityDiscussions.map((d, i) => (
                      <div key={d.id ?? i} className="hg-thread-message">
                        <strong>{d.authorLabel ?? "匿名"}</strong>
                        <p>{d.content}</p>
                        {d.createdAt && (
                          <small>{new Date(d.createdAt).toLocaleDateString("zh-CN")}</small>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="hg-empty-discussions">还没有讨论，来写第一条吧。</p>
                )}
              </section>

              {view.evidence.length > 0 && (
                <details className="hg-evidence">
                  <summary>收集到的经历（{view.evidence.length} 条）</summary>
                  {view.evidence.map((record) => (
                    <article key={record.id} className="hg-source">
                      <span className="hg-eyebrow">用户提交的经历</span>
                      <p>{record.submission.statement}</p>
                      <small>
                        {view.impactReceipts.find((r) => r.evidenceId === record.id)?.accepted
                          ? "已纳入参考"
                          : "暂未纳入"}
                      </small>
                    </article>
                  ))}
                </details>
              )}

              <footer className="hg-footer">
                最后更新：
                {new Date(view!.updatedAt).toLocaleString("zh-CN")}
              </footer>
            </>
          )}
        </main>

        <aside className={"hg-sources-sidebar" + (sourcesExpanded ? " expanded" : "")}>
          <div className="hg-sources-header">
            <button
              className="hg-sources-toggle"
              type="button"
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              title={sourcesExpanded ? "收起来源" : "展开来源"}
              aria-expanded={sourcesExpanded}
              aria-label={sourcesExpanded ? "收起来源" : "展开来源"}
            >
              {sourcesExpanded ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
            <span className="hg-sources-title">来源</span>
            <span className="hg-sources-count">{sources.length}</span>
          </div>
          <div className="hg-sources-list">
            {visibleSources.map((src) => (
              <a
                key={src.id}
                className="hg-source-mini"
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="hg-source-mini-title">{src.title}</span>
                {sourcesExpanded && (
                  <span className="hg-source-mini-meta">
                    {src.authorName && <span>{src.authorName}</span>}
                    {src.publishedAt && (
                      <span>{new Date(src.publishedAt).toLocaleDateString("zh-CN")}</span>
                    )}
                    <ExternalLink size={11} />
                  </span>
                )}
              </a>
            ))}
            {!sourcesExpanded && sources.length > 10 && (
              <button
                className="hg-sources-more"
                type="button"
                onClick={() => setSourcesExpanded(true)}
              >
                +{sources.length - 10} 更多
              </button>
            )}
          </div>

          {view && view.evidence.length > 0 && (
            <details className="hg-evidence-badge">
              <summary>经历记录（{view.evidence.length}）</summary>
              <div className="hg-evidence-badge-list">
                {view.evidence.map((r) => (
                  <p key={r.id}>{r.submission.statement.slice(0, 80)}…</p>
                ))}
              </div>
            </details>
          )}
        </aside>
      </div>

      <div className="hg-chat-floating">
        {!chatOpen ? (
          <button
            className="hg-chat-button"
            type="button"
            onClick={() => setChatOpen(true)}
            title="与 Agent 对话"
          >
            <MessageCircle size={22} />
          </button>
        ) : (
          <div className="hg-chat-panel">
            <div className="hg-chat-header">
              <Bot size={18} />
              <span>与 Agent 对话</span>
              <button className="icon-button" type="button" onClick={() => setChatOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="hg-chat-messages">
              {chatMessages.length === 0 && (
                <p className="hg-chat-empty">
                  有什么想问的？你的经历或看法都可能帮助完善这篇文章。
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={"hg-chat-message " + msg.role}>
                  {msg.role === "agent" && <Bot size={14} />}
                  <span>{msg.content}</span>
                </div>
              ))}
              {chatLoading && (
                <div className="hg-chat-message agent">
                  <Bot size={14} />
                  <span className="hg-chat-typing">
                    <LoaderCircle className="spin" size={14} /> 思考中…
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form
              className="hg-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend();
              }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="输入你的问题或经历…"
                disabled={chatLoading}
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {joining && view && view.activeInvitation && (
        <ConversationDrawer
          mission={view.activeInvitation}
          onClose={() => setJoining(false)}
          onComplete={complete}
        />
      )}
    </div>
  );
}
