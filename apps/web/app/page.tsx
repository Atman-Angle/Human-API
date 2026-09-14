"use client";

import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileCheck2,
  Globe2,
  Info,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  EvidenceGrade,
  EvidenceMission,
  EvidenceRecord,
  EvidenceSubmission,
  ImpactReceipt,
  Investigation,
  KnowledgeStateStatus,
  SearchProvenance,
  SourceRef,
} from "@human-api/contracts";
import {
  ApiClientError,
  createInvestigation,
  listInvestigations,
  listMissions,
} from "@/lib/api-client";
import {
  getMockCircle,
  listMockCircles,
  listMockPosts,
  type MockCircle,
  type MockPost,
} from "@/lib/mock-circles";
import {
  createMockInvestigation,
  listMockContributions,
  listMockInvestigations,
  mockInvestigationToListItem,
  type ContributionType,
  type MockContribution,
  type MockFeedItem,
} from "@/lib/mock-data";

const GOLDEN_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";

const loadingSteps = [
  "正在检索知乎社区中的真实经验",
  "正在对照全网资料与外部证据",
  "正在划定已知结论与知识边界",
  "正在寻找适合真人补充的证据缺口",
];

const knowledgeLabels: Record<KnowledgeStateStatus, string> = {
  UNRESOLVED: "尚待求证",
  EARLY_EVIDENCE: "已有早期证据",
  SUPPORTED_WITH_LIMITATIONS: "有限支持",
};

const gradeLabels: Record<EvidenceGrade, string> = {
  E0_OPINION: "E0 · 观点",
  E1_FIRST_HAND: "E1 · 第一手观察",
  E2_ARTIFACT_BACKED: "E2 · 材料佐证",
};

const provenanceLabels: Record<SearchProvenance, string> = {
  LIVE: "实时检索",
  CACHE: "缓存结果",
  GOLDEN_FIXTURE: "演示数据",
};

interface EvidenceFormState {
  participantType: string;
  timeframe: string;
  experience: string;
  task: string;
  aiRole: string;
  humanJudgment: string;
  artifactUrl: string;
}

const emptyEvidenceForm: EvidenceFormState = {
  participantType: "",
  timeframe: "最近 30 天",
  experience: "",
  task: "",
  aiRole: "",
  humanJudgment: "",
  artifactUrl: "",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "发生了未知错误，请稍后重试。";
}

function StatusBadge({ status }: { status: KnowledgeStateStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span className="status-dot" />
      {knowledgeLabels[status]}
    </span>
  );
}

export function AppHeader({
  onReset,
  hasInvestigation,
  onSearch,
  onMyInvestigations,
  onVerify,
  activeNav,
}: {
  onReset: () => void;
  hasInvestigation: boolean;
  onSearch?: () => void;
  onMyInvestigations?: () => void;
  onVerify?: () => void;
  activeNav?: "home" | "verify" | "search" | "mine";
}) {
  const nav = activeNav ?? "home";
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={onReset} aria-label="返回首页">
          <span className="brand-mark">H</span>
          <span className="brand-name">知乎 · 求证 Agent</span>
        </button>
        <nav className="header-nav" aria-label="主导航">
          <button
            className={"nav-item" + (nav === "home" ? " active" : "")}
            type="button"
            onClick={onReset}
          >
            首页
          </button>
          <button
            className={"nav-item" + (nav === "verify" ? " active" : "")}
            type="button"
            onClick={onVerify}
          >
            求证
          </button>
          <button
            className={"nav-item" + (nav === "search" ? " active" : "")}
            type="button"
            onClick={onSearch}
          >
            <Search size={15} />
            搜索
          </button>
          <button
            className={"nav-item" + (nav === "mine" ? " active" : "")}
            type="button"
            onClick={onMyInvestigations}
          >
            我的求证
          </button>
        </nav>
        <div className="header-actions">
          {hasInvestigation ? (
            <button className="quiet-button" type="button" onClick={onReset}>
              <RotateCcw size={16} />
              新建求证
            </button>
          ) : null}
          <span className="service-state">
            <span className="service-dot" />
            Agent 在线
          </span>
        </div>
      </div>
    </header>
  );
}

function formatRelativeTime(value: string): string {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`;
  return `${Math.floor(minutes / 1440)}天前`;
}

function FeedCard({ item, onOpen }: { item: MockFeedItem; onOpen: (id: string) => void }) {
  const stateClass = item.knowledgeState.toLowerCase();
  const stateLabel = knowledgeLabels[item.knowledgeState];
  const actionLabel = item.knowledgeState === "UNRESOLVED" ? "查看缺口" : "查看分析";
  return (
    <article className="feed-card">
      <button className="feed-card-main" type="button" onClick={() => onOpen(item.id)}>
        <div className="feed-author">
          <span className="author-avatar">知</span>
          <span>@{item.author}</span>
          <i />
          <span>{formatRelativeTime(item.createdAt)}</span>
        </div>
        <h2>{item.question}</h2>
        <p className="feed-excerpt">{item.excerpt}</p>
        <div className="claim-preview-list">
          {item.claims.map((claim) => (
            <div className="claim-preview-item" key={claim.id}>
              <span className={`claim-confidence claim-${claim.confidence.toLowerCase()}`}>
                {claim.confidence === "HIGH"
                  ? "较可信"
                  : claim.confidence === "MEDIUM"
                    ? "待验证"
                    : "证据不足"}
              </span>
              <p>{claim.text}</p>
              <div className="claim-counts">
                <span className="claim-support">支持 {claim.supportCount}</span>
                <span className="claim-oppose">反驳 {claim.opposeCount}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="feed-conflict">
          <span>主要分歧</span>
          <p>{item.conflictText}</p>
        </div>
        <div className="feed-stats">
          <span>
            <CheckCircle2 size={15} />
            {item.evidenceCount} 条证据
          </span>
          <span>
            <MessageCircle size={15} />
            {item.discussionCount} 条讨论
          </span>
          {item.firstHandCount > 0 ? (
            <span>
              <Users size={15} />
              {item.firstHandCount} 条第一手经历
            </span>
          ) : (
            <span>
              <StarIcon />
              持续求证中
            </span>
          )}
        </div>
      </button>
      <aside className="feed-agent-card">
        <div className="agent-card-label">
          <Sparkles size={15} />
          Agent
        </div>
        <span className={`agent-state agent-${stateClass}`}>
          <span className="status-dot" />
          {stateLabel}
        </span>
        <div className="agent-metric">
          <strong>{item.discussionCount}</strong>
          <span>条相关讨论</span>
        </div>
        <div className="agent-metric">
          <strong>{item.firstHandCount}</strong>
          <span>{item.firstHandCount === 0 ? "等待第一手经历" : "条第一手经历"}</span>
        </div>
        <p className="agent-gap">
          当前缺口
          <br />
          <b>{item.gapText}</b>
        </p>
        <button className="agent-open" type="button" onClick={() => onOpen(item.id)}>
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      </aside>
    </article>
  );
}

function StarIcon() {
  return <span className="star-glyph">★</span>;
}

function CircleHeader({
  circle,
  retrieving,
  lastIntegratedAt,
  onRetrieve,
}: {
  circle: MockCircle;
  retrieving: boolean;
  lastIntegratedAt: string;
  onRetrieve: () => void;
}) {
  return (
    <section className="circle-header">
      <div className="circle-identity">
        <span className="circle-mark">{circle.name.slice(0, 1)}</span>
        <div>
          <h1>{circle.name} 圈子</h1>
          <p>
            {circle.tagline} · {circle.memberLabel}
          </p>
        </div>
      </div>
      <div className="circle-agent">
        <span className="circle-agent-line">
          <Sparkles size={15} />
          Agent 已检索 {circle.discussionCount} 条知乎讨论 · 覆盖 {circle.topicCount} 个话题
        </span>
        <span className="circle-agent-line subtle">
          最近整合：{formatRelativeTime(lastIntegratedAt)}
        </span>
        <button
          className="circle-retrieve"
          type="button"
          onClick={onRetrieve}
          disabled={retrieving}
        >
          {retrieving ? <LoaderCircle className="spin" size={16} /> : <RotateCcw size={16} />}
          {retrieving ? "正在检索知乎…" : "重新检索并整合"}
        </button>
      </div>
    </section>
  );
}

function AggregatedPostCard({
  post,
  onOpen,
  showCircle,
}: {
  post: MockPost;
  onOpen: (id: string) => void;
  showCircle?: boolean;
}) {
  return (
    <article className="post-card">
      <button className="post-card-main" type="button" onClick={() => onOpen(post.id)}>
        <div className="post-meta">
          {showCircle ? <span className="post-circle">{post.circleName}</span> : null}
          <span className="post-agent-badge">
            <Sparkles size={13} />
            Agent 聚合
          </span>
          <span className="post-time">{formatRelativeTime(post.updatedAt)}更新</span>
        </div>
        <h2 className="post-title">{post.title}</h2>
        <p className="post-summary">{post.summary}</p>
        <ul className="post-points">
          {post.keyPoints.slice(0, 3).map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <div className="post-merged">
          <span>整合自</span>
          {post.mergedQuestions.map((question) => (
            <em key={question}>{question}</em>
          ))}
        </div>
        <div className="post-stats">
          <span>
            <Globe2 size={15} />
            {post.sourceCount} 条知乎讨论
          </span>
          <span>
            <CheckCircle2 size={15} />
            {post.answerCount} 条回答
          </span>
          <span>
            <MessageCircle size={15} />
            热度 {post.heat}
          </span>
        </div>
      </button>
    </article>
  );
}

function CirclePlaza({
  circles,
  onSelect,
}: {
  circles: MockCircle[];
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="circle-plaza">
      <div className="feed-section-heading">
        <h2>圈子广场</h2>
        <p>每个圈子都由 Agent 持续检索知乎讨论并整合成结构清晰的帖子。</p>
      </div>
      <div className="circle-grid">
        {circles.map((circle) => (
          <button
            className="circle-tile"
            type="button"
            key={circle.slug}
            onClick={() => onSelect(circle.slug)}
          >
            <span className="circle-tile-mark">{circle.name.slice(0, 1)}</span>
            <strong>{circle.name}</strong>
            <span>{circle.tagline}</span>
            <small>
              {circle.discussionCount} 条讨论 · {circle.topicCount} 个话题
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PostsHome({
  posts,
  circleSlug,
  onSelectCircle,
  onOpenPost,
  onOpenInvestigation,
  verifyItems,
  verifyLoading,
  notice,
  onAsk,
  onVerify,
  onMine,
}: {
  posts: MockPost[];
  circleSlug: string | null;
  onSelectCircle: (slug: string | null) => void;
  onOpenPost: (id: string) => void;
  onOpenInvestigation: (id: string) => void;
  verifyItems: MockFeedItem[];
  verifyLoading: boolean;
  notice?: string | null;
  onAsk: () => void;
  onVerify: () => void;
  onMine: () => void;
}) {
  const circles = listMockCircles();
  const isPlaza = circleSlug === "more";
  const activeCircle = circleSlug && !isPlaza ? getMockCircle(circleSlug) : undefined;
  const listedPosts = activeCircle
    ? posts.filter((post) => post.circleSlug === activeCircle.slug)
    : posts;
  const [retrieving, setRetrieving] = useState(false);
  const [integratedAt, setIntegratedAt] = useState<Record<string, string>>({});

  function handleRetrieve(slug: string) {
    setRetrieving(true);
    window.setTimeout(() => {
      setRetrieving(false);
      setIntegratedAt((current) => ({ ...current, [slug]: new Date().toISOString() }));
    }, 1400);
  }
  return (
    <main className="feed-page">
      <div className="feed-container">
        <div className="feed-toolbar">
          <div className="topic-row" aria-label="圈子与推荐">
            <button
              className={circleSlug === null ? "topic active" : "topic"}
              type="button"
              onClick={() => onSelectCircle(null)}
            >
              推荐
            </button>
            {circles.map((circle) => (
              <button
                className={circleSlug === circle.slug ? "topic active" : "topic"}
                key={circle.slug}
                type="button"
                onClick={() => onSelectCircle(circle.slug)}
              >
                {circle.name}
              </button>
            ))}
            <button
              className={isPlaza ? "topic active" : "topic"}
              type="button"
              onClick={() => onSelectCircle("more")}
            >
              更多
            </button>
          </div>
          <button className="ask-trigger" type="button" onClick={onAsk}>
            <Sparkles size={16} />
            发起求证
          </button>
        </div>
        {activeCircle ? (
          <>
            <CircleHeader
              circle={activeCircle}
              retrieving={retrieving}
              lastIntegratedAt={integratedAt[activeCircle.slug] ?? activeCircle.updatedAt}
              onRetrieve={() => handleRetrieve(activeCircle.slug)}
            />
            {retrieving ? (
              <div className="circle-progress" role="status">
                <LoaderCircle className="spin" size={17} />
                Agent 正在检索「{activeCircle.name}」圈子的知乎讨论，并重新整合标题与结构…
              </div>
            ) : null}
            {listedPosts.length === 0 ? (
              <div className="feed-empty">
                <Sparkles size={24} />
                <h2>{activeCircle.name} 圈子还没有聚合内容</h2>
                <p>让 Agent 检索该圈子在知乎的讨论，整合成结构清晰的帖子。</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => handleRetrieve(activeCircle.slug)}
                >
                  让 Agent 检索这个圈子
                </button>
              </div>
            ) : (
              <div className="feed-list">
                {listedPosts.map((post) => (
                  <AggregatedPostCard key={post.id} post={post} onOpen={onOpenPost} />
                ))}
              </div>
            )}
          </>
        ) : isPlaza ? (
          <CirclePlaza circles={circles} onSelect={onSelectCircle} />
        ) : (
          <>
            <section className="feed-section-heading">
              <h2>推荐 · 来自各圈子的聚合帖</h2>
              <p>Agent 先检索知乎讨论，再重新生成标题与结构；点开可以看到来源与知识边界。</p>
            </section>
            <div className="feed-list">
              {listedPosts.map((post) => (
                <AggregatedPostCard key={post.id} post={post} onOpen={onOpenPost} showCircle />
              ))}
            </div>
            <section className="verify-strip">
              <div className="verify-strip-heading">
                <div>
                  <h2>正在进行的求证</h2>
                  <p>对具体问题发起的求证：Agent 划定知识边界，等待真正经历过的人补齐缺口。</p>
                </div>
                <button className="quiet-link" type="button" onClick={onVerify}>
                  查看全部求证 →
                </button>
              </div>
              {notice ? (
                <div className="feed-notice compact" role="status">
                  <Info size={16} />
                  <span>{notice}</span>
                </div>
              ) : null}
              {verifyLoading ? (
                <div className="feed-loading">
                  <LoaderCircle className="spin" size={18} />
                  正在加载求证…
                </div>
              ) : (
                <div className="feed-list">
                  {verifyItems.slice(0, 2).map((item) => (
                    <FeedCard item={item} onOpen={onOpenInvestigation} key={item.id} />
                  ))}
                </div>
              )}
            </section>
            <button className="load-more" type="button" onClick={onMine}>
              ↓ 加载更多
            </button>
            <p className="load-more-end">— 没有更多了 —</p>
          </>
        )}
      </div>
    </main>
  );
}

function VerifyHome({
  items,
  loading,
  error,
  notice,
  onOpen,
  onAsk,
}: {
  items: MockFeedItem[];
  loading: boolean;
  error: string | null;
  notice?: string | null;
  onOpen: (id: string) => void;
  onAsk: () => void;
}) {
  return (
    <main className="feed-page">
      <div className="feed-container">
        <section className="verify-hero">
          <div>
            <h1>求证</h1>
            <p>
              对某个具体问题发起求证：Agent 先划定已有证据与知识边界，再请真正经历过的人补齐缺口。
            </p>
          </div>
          <button className="ask-trigger" type="button" onClick={onAsk}>
            <Sparkles size={16} />
            发起求证
          </button>
        </section>
        {notice ? (
          <div className="feed-notice" role="status">
            <Info size={17} />
            <span>{notice}</span>
          </div>
        ) : null}
        {loading ? (
          <div className="feed-loading">
            <LoaderCircle className="spin" size={20} />
            正在加载求证动态…
          </div>
        ) : null}
        {error ? (
          <div className="feed-error" role="alert">
            <CircleAlert size={17} />
            {error}
            <button type="button" onClick={onAsk}>
              发起新的求证
            </button>
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="feed-empty">
            <Sparkles size={24} />
            <h2>还没有公开求证</h2>
            <p>从一个你真正想知道的问题开始。</p>
            <button className="primary-button" type="button" onClick={onAsk}>
              发起第一次求证
            </button>
          </div>
        ) : null}
        <div className="feed-list">
          {items.map((item) => (
            <FeedCard item={item} onOpen={onOpen} key={item.id} />
          ))}
        </div>
      </div>
    </main>
  );
}

export function PostView({ post }: { post: MockPost }) {
  const router = useRouter();
  return (
    <div className="app-shell">
      <AppHeader
        onReset={() => router.push("/")}
        hasInvestigation={false}
        onVerify={() => router.push("/#verify")}
        onSearch={() => router.push("/#search")}
        onMyInvestigations={() => router.push("/#mine")}
        activeNav="home"
      />
      <main className="post-page">
        <div className="post-container">
          <button
            className="back-link"
            type="button"
            onClick={() => router.push(`/?circle=${encodeURIComponent(post.circleSlug)}`)}
          >
            ← 返回 {post.circleName} 圈子
          </button>
          <article className="post-article">
            <div className="post-meta">
              <span className="post-circle">{post.circleName}</span>
              <span className="post-agent-badge">
                <Sparkles size={13} />
                Agent 聚合
              </span>
              <span className="post-time">{formatRelativeTime(post.updatedAt)}更新</span>
            </div>
            <h1>{post.title}</h1>
            <p className="post-lead">{post.summary}</p>
            <div className="post-stats">
              <span>
                <Globe2 size={15} />
                {post.sourceCount} 条知乎讨论
              </span>
              <span>
                <CheckCircle2 size={15} />
                {post.answerCount} 条回答
              </span>
              <span>
                <MessageCircle size={15} />
                热度 {post.heat}
              </span>
            </div>

            <section className="post-section">
              <h2>关键结论</h2>
              <ul className="post-points">
                {post.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="post-section">
              <h2>整合自哪些讨论</h2>
              <p className="post-section-note">
                这些提问标题零散、彼此重复，Agent 合并后重新生成了上面的标题与结构。
              </p>
              <div className="post-merged stacked">
                {post.mergedQuestions.map((question) => (
                  <em key={question}>{question}</em>
                ))}
              </div>
              <div className="post-tags">
                {post.sourceTopics.map((topic) => (
                  <span key={topic}>{topic}</span>
                ))}
              </div>
            </section>

            <section className="post-section">
              <h2>引用回答节选</h2>
              <div className="post-quotes">
                {post.quotes.map((quote) => (
                  <blockquote key={quote.author}>
                    <p>{quote.excerpt}</p>
                    <footer>
                      {quote.author} · 赞同 {quote.voteUpCount}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </section>

            <section className="post-frontier">
              <div className="post-frontier-heading">
                <CircleAlert size={17} />
                <div>
                  <h2>这篇帖子还无法确认的部分</h2>
                  <p>{post.frontier}</p>
                </div>
              </div>
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  router.push(`/?ask=${encodeURIComponent(post.title)}#search`)
                }
              >
                <Sparkles size={16} />
                对这个问题发起求证
              </button>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}

function AskView({
  question,
  setQuestion,
  onSubmit,
  loading,
  error,
  onClose,
}: {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  onClose?: () => void;
}) {
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(
      () => setLoadingStep((current) => (current + 1) % loadingSteps.length),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [loading]);

  return (
    <main className="ask-page">
      <section className="ask-stage">
        {onClose ? (
          <button className="ask-close" type="button" onClick={onClose} aria-label="关闭提问面板">
            <X size={18} />
          </button>
        ) : null}
        <div className="eyebrow">
          <Sparkles size={15} />
          让答案停在证据边界上
        </div>
        <h1>有些问题，搜索之后才真正开始。</h1>
        <p className="ask-description">
          Agent 先整理已有信息，再把尚未解决的部分交给真正经历过的人。
        </p>

        <form className={`question-box ${loading ? "is-loading" : ""}`} onSubmit={onSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="输入一个需要真实经验才能回答的问题"
            aria-label="求证问题"
            rows={3}
            maxLength={500}
            disabled={loading}
          />
          <div className="question-box-footer">
            <span className="input-hint">知乎内容 · 全网资料 · 真人证据</span>
            <button
              className="submit-question"
              type="submit"
              disabled={loading || question.trim().length === 0}
              aria-label="开始求证"
            >
              {loading ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={20} />}
            </button>
          </div>
        </form>

        {error ? (
          <div className="inline-error" role="alert">
            <CircleAlert size={17} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="investigation-progress" aria-live="polite">
            <div className="progress-line">
              <span style={{ width: `${25 + loadingStep * 22}%` }} />
            </div>
            <Bot size={18} />
            <span key={loadingStep}>{loadingSteps[loadingStep]}</span>
          </div>
        ) : (
          <button
            className="golden-question"
            type="button"
            onClick={() => setQuestion(GOLDEN_QUESTION)}
          >
            <Lightbulb size={16} />
            <span>试试：{GOLDEN_QUESTION}</span>
            <ArrowRight size={15} />
          </button>
        )}

        <div className="ask-principles" aria-label="求证原则">
          <span>
            <Search size={15} />
            先检索
          </span>
          <i />
          <span>
            <Target size={15} />
            找缺口
          </span>
          <i />
          <span>
            <Users size={15} />
            问真人
          </span>
          <i />
          <span>
            <FileCheck2 size={15} />
            更新结论
          </span>
        </div>
      </section>
    </main>
  );
}

function ClaimList({
  title,
  items,
  variant,
}: {
  title: string;
  items: Investigation["knowledgeState"]["supported"];
  variant: "supported" | "unsupported";
}) {
  if (items.length === 0) return null;
  return (
    <section className="content-section">
      <div className="section-heading">
        <span className={`section-icon ${variant}`}>
          {variant === "supported" ? <Check size={16} /> : <CircleAlert size={16} />}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{variant === "supported" ? "当前证据能够支持的表述" : "证据不足，不代表结论为假"}</p>
        </div>
      </div>
      <div className="claim-list">
        {items.map((item) => (
          <article className="claim-item" key={item.id}>
            <h3>{item.claim}</h3>
            <p>{item.rationale}</p>
            <span>{item.evidenceIds.length || item.sourceRefIds.length} 条关联证据</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceCard({ source }: { source: SourceRef }) {
  return (
    <a className="source-card" href={source.url} target="_blank" rel="noreferrer">
      <div className="source-provider">
        {source.provider === "ZHIHU" ? <span className="zhihu-z">知</span> : <Globe2 size={16} />}
        <span>{source.provider === "ZHIHU" ? "知乎" : "全网"}</span>
      </div>
      <div className="source-body">
        <h3>{source.title || "未命名来源"}</h3>
        <p>{source.excerpt}</p>
        <span>{source.authorName ? `${source.authorName} · ` : ""}查看原文</span>
      </div>
      <ExternalLink size={16} />
    </a>
  );
}

export function EvidenceOutcome({
  record,
  receipt,
  before,
  after,
  onDismiss,
}: {
  record: EvidenceRecord;
  receipt?: ImpactReceipt;
  before: KnowledgeStateStatus;
  after: KnowledgeStateStatus;
  onDismiss: () => void;
}) {
  return (
    <section className="outcome-panel" aria-live="polite">
      <button
        className="icon-button outcome-close"
        type="button"
        onClick={onDismiss}
        aria-label="关闭结果"
      >
        <X size={17} />
      </button>
      <div className={`outcome-icon ${record.matchesGap ? "accepted" : "rejected"}`}>
        {record.matchesGap ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}
      </div>
      <div className="outcome-copy">
        <span className="outcome-kicker">Evidence 评估完成</span>
        <h2>{record.matchesGap ? "这条观察已进入求证链路" : "这条内容暂未影响当前结论"}</h2>
        <p>{receipt?.impactSummary ?? record.gradeReason}</p>
        <div className="outcome-meta">
          <span className={`grade grade-${record.grade.toLowerCase()}`}>
            {gradeLabels[record.grade]}
          </span>
          <span>{record.matchesGap ? "匹配当前缺口" : "未匹配当前缺口"}</span>
          <span className="state-change">
            {knowledgeLabels[before]} <ArrowRight size={13} /> {knowledgeLabels[after]}
          </span>
        </div>
        {receipt?.stillMissing.length ? (
          <div className="outcome-missing">
            <span>仍然缺少</span>
            <p>{receipt.stillMissing.join(" ")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function MissionDrawer({
  mission,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  mission: EvidenceMission;
  onClose: () => void;
  onSubmit: (submission: EvidenceSubmission) => Promise<void>;
  submitting: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState<EvidenceFormState>({
    ...emptyEvidenceForm,
    participantType: mission.qualification[0] ?? "",
  });

  function updateField<K extends keyof EvidenceFormState>(field: K, value: EvidenceFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const experience = `${form.timeframe}。${form.experience.trim()}`;
    const statement = `${form.task.trim()}；${form.aiRole.trim()}；${form.humanJudgment.trim()}`;
    await onSubmit({
      statement,
      participantType: form.participantType,
      experience,
      task: form.task.trim(),
      aiRole: form.aiRole.trim(),
      humanJudgment: form.humanJudgment.trim(),
      ...(form.artifactUrl.trim() ? { artifactUrl: form.artifactUrl.trim() } : {}),
    });
  }

  const valid =
    form.participantType &&
    form.experience.trim().length >= 2 &&
    form.task.trim().length >= 2 &&
    form.aiRole.trim().length >= 2 &&
    form.humanJudgment.trim().length >= 2;

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="关闭任务" />
      <aside
        className="mission-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-title"
      >
        <header className="drawer-header">
          <div>
            <span className="drawer-kicker">
              真人求证任务 · {mission.status === "OPEN" ? "OPEN · 可参与" : "CLOSED · 已关闭"}
            </span>
            <h2 id="mission-title">{mission.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭任务">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-content">
          <div className="mission-brief">
            <Target size={18} />
            <p>{mission.description}</p>
          </div>
          <div className="mission-time">
            <Clock3 size={15} />
            只需记录一次真实经历，不需要写完整答案
          </div>
          {mission.status === "CLOSED" ? (
            <div className="form-error" role="status">
              <CircleAlert size={16} />
              这个 Mission 已关闭，暂时不能提交新的 Evidence。
            </div>
          ) : null}

          <form className="evidence-form" onSubmit={handleSubmit}>
            <label className="field-label">
              <span>你的身份</span>
              <select
                value={form.participantType}
                onChange={(event) => updateField("participantType", event.target.value)}
                required
              >
                {mission.qualification.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              <span>发生时间</span>
              <select
                value={form.timeframe}
                onChange={(event) => updateField("timeframe", event.target.value)}
              >
                <option>最近 24 小时</option>
                <option>最近 7 天</option>
                <option>最近 30 天</option>
                <option>更早</option>
              </select>
            </label>

            <label className="field-label field-wide">
              <span>经历背景</span>
              <textarea
                value={form.experience}
                onChange={(event) => updateField("experience", event.target.value)}
                placeholder="例如：我在实习项目中持续使用 Claude Code 完成后端开发"
                rows={2}
                required
              />
            </label>

            <label className="field-label field-wide">
              <span>具体是什么任务？</span>
              <textarea
                value={form.task}
                onChange={(event) => updateField("task", event.target.value)}
                placeholder="例如：接口测试、异常场景和边界条件"
                rows={2}
                required
              />
            </label>

            <label className="field-label field-wide">
              <span>AI 具体做了什么？</span>
              <textarea
                value={form.aiRole}
                onChange={(event) => updateField("aiRole", event.target.value)}
                placeholder="描述被 AI 接手或改变的环节"
                rows={2}
                required
              />
            </label>

            <label className="field-label field-wide">
              <span>你最后负责了什么判断？</span>
              <textarea
                value={form.humanJudgment}
                onChange={(event) => updateField("humanJudgment", event.target.value)}
                placeholder="描述你如何检查、修正或决定最终结果"
                rows={2}
                required
              />
            </label>

            <label className="field-label field-wide artifact-field">
              <span>相关材料（可选）</span>
              <div className="url-input">
                <Upload size={17} />
                <input
                  type="url"
                  value={form.artifactUrl}
                  onChange={(event) => updateField("artifactUrl", event.target.value)}
                  placeholder="截图、记录或公开链接"
                />
              </div>
              <small>材料只增强这次个人观察的可信度，不代表总体结论。</small>
            </label>

            {error ? (
              <div className="form-error" role="alert">
                <CircleAlert size={16} />
                {error}
              </div>
            ) : null}

            <div className="drawer-submit-row">
              <span>
                <ShieldCheck size={15} /> 系统将校验相关性并给出 Evidence Grade
              </span>
              <button
                className="primary-button"
                type="submit"
                disabled={!valid || submitting || mission.status === "CLOSED"}
              >
                {submitting ? <LoaderCircle className="spin" size={18} /> : <Send size={17} />}
                {submitting ? "正在评估" : "提交真实经历"}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}

export function FrontierPanel({
  investigation,
  onJoin,
  creatingMission,
}: {
  investigation: Investigation;
  onJoin: () => void;
  creatingMission: boolean;
}) {
  const gap = investigation.knowledgeState.nextGap ?? investigation.evidenceState.nextGap;
  const suitability = investigation.evidenceState.gapSuitability;

  return (
    <aside className="frontier-column">
      <section className="frontier-panel">
        <div className="frontier-label">
          <Target size={17} />
          Knowledge Frontier
        </div>
        <h2>现在还缺什么？</h2>
        {gap ? (
          <>
            <p className="gap-observation">{gap.missingObservation}</p>
            <div className="frontier-reason">
              <span>为什么公开资料还不够</span>
              <p>{gap.whyUnresolved}</p>
            </div>
            {suitability ? (
              <div className={`suitability-line suitability-${suitability.status.toLowerCase()}`}>
                <span className="suitability-dot" />
                {suitability.status === "MISSION_READY"
                  ? "这个缺口适合由真人补充"
                  : suitability.status === "NEEDS_REFRAMING"
                    ? "Agent 已重新定义这个缺口"
                    : "这个缺口暂不适合真人补充"}
              </div>
            ) : null}
            <div className="frontier-divider" />
            <div className="frontier-detail">
              <span>
                <Users size={16} />
                需要谁来回答
              </span>
              <div className="participant-tags">
                {gap.targetParticipants.map((participant) => (
                  <b key={participant}>{participant}</b>
                ))}
              </div>
            </div>
            <div className="frontier-detail">
              <span>
                <Sparkles size={16} />
                这条观察会帮助
              </span>
              <p>{gap.expectedValue}</p>
            </div>
            <button
              className="frontier-cta"
              type="button"
              onClick={onJoin}
              disabled={creatingMission}
            >
              {creatingMission ? <LoaderCircle className="spin" size={18} /> : <Users size={18} />}
              {investigation.missions.length > 0 ? "贡献我的经历" : "参与这次求证"}
              {!creatingMission ? <ArrowRight size={17} /> : null}
            </button>
            <p className="frontier-note">只提交一条真实经历，不要求你证明完整结论。</p>
          </>
        ) : (
          <div className="no-gap">
            <CheckCircle2 size={24} />
            <p>{suitability?.reason ?? "当前没有适合转换为真人任务的证据缺口。"}</p>
          </div>
        )}
      </section>

      <section className="method-panel">
        <span>本次求证路径</span>
        <ol>
          <li className="done">检索知乎与全网</li>
          <li className="done">划定知识边界</li>
          <li className="active">邀请真人补充</li>
          <li className={investigation.evidence.length > 0 ? "done" : ""}>根据证据重评</li>
        </ol>
      </section>
    </aside>
  );
}

const contributionLabels: Record<ContributionType, string> = {
  VIEWPOINT: "补充观点",
  COUNTEREXAMPLE: "提供反例",
  EVIDENCE: "提交第一手经历",
};

const contributionHints: Record<ContributionType, string> = {
  VIEWPOINT: "表达看法、补充背景，不直接改变 Knowledge State。",
  COUNTEREXAMPLE: "说明当前 Claim 在什么场景下不成立。",
  EVIDENCE: "记录一次亲身经历，进入 Evidence 评估链路。",
};

function ContributionComposer({
  type,
  onClose,
  onSubmit,
}: {
  type: ContributionType;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" type="button" onClick={onClose} aria-label="关闭" />
      <aside className="mission-drawer" role="dialog" aria-modal="true">
        <header className="drawer-header">
          <div>
            <span className="drawer-kicker">{contributionLabels[type]}</span>
            <h2>你正在推进这个问题</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭">
            <X size={20} />
          </button>
        </header>
        <div className="drawer-content">
          <div className="mission-brief">
            <Sparkles size={18} />
            <p>{contributionHints[type]}</p>
          </div>
          <label className="field-label field-wide" style={{ marginTop: 18 }}>
            <span>{contributionLabels[type]}</span>
            <textarea
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={
                type === "COUNTEREXAMPLE"
                  ? "例如：在我遇到的场景里，这条结论并不成立，因为……"
                  : type === "EVIDENCE"
                    ? "描述一次具体经历：发生了什么、什么时候、你扮演什么角色、哪些地方不确定"
                    : "补充你的观点或背景信息"
              }
            />
          </label>
          <div className="drawer-submit-row">
            <span>
              <ShieldCheck size={15} />
              {type === "EVIDENCE"
                ? "提交后由 Agent 评估，不以你的判断为准"
                : "不会直接改变 Knowledge State"}
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={text.trim().length < 2}
              onClick={() => onSubmit(text.trim())}
            >
              <Send size={16} />
              提交
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ContributionsSection({ contributions }: { contributions: MockContribution[] }) {
  if (contributions.length === 0) {
    return (
      <section className="content-section">
        <div className="section-heading">
          <span className="section-icon known">
            <Users size={16} />
          </span>
          <div>
            <h2>社区贡献</h2>
            <p>还没有人参与推进这个问题</p>
          </div>
        </div>
        <div className="console-empty">成为第一个贡献者</div>
      </section>
    );
  }
  return (
    <section className="content-section">
      <div className="section-heading">
        <span className="section-icon known">
          <Users size={16} />
        </span>
        <div>
          <h2>社区贡献</h2>
          <p>谁用什么方式推进了这个问题</p>
        </div>
      </div>
      <div className="contribution-list">
        {contributions.map((item) => (
          <article className="contribution-item" key={item.id}>
            <span className={`contribution-type type-${item.type.toLowerCase()}`}>
              {contributionLabels[item.type]}
            </span>
            <div className="contribution-body">
              <h4>{item.summary}</h4>
              <div className="contribution-meta">
                <span>@{item.author}</span>
                <span>{formatRelativeTime(item.createdAt)}</span>
                {item.grade ? <span>{gradeLabels[item.grade as EvidenceGrade]}</span> : null}
                {item.accepted ? <span className="contribution-impact">已进入求证链路</span> : null}
                {item.impact ? <span className="contribution-impact">{item.impact}</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MyInvestigationsConsole({
  items,
  onOpen,
  onClose,
  missions = [],
}: {
  items: MockFeedItem[];
  onOpen: (id: string) => void;
  onClose: () => void;
  missions?: Array<{
    id: string;
    investigationId: string;
    title: string;
    status: "OPEN" | "CLOSED";
    evidenceCount: number;
  }>;
}) {
  const evidenceCount = items.reduce((sum, item) => sum + item.evidenceCount, 0);
  const firstHandCount = items.reduce((sum, item) => sum + item.firstHandCount, 0);
  const unresolved = items.filter((item) => item.knowledgeState === "UNRESOLVED").length;
  return (
    <div className="console-overlay">
      <main className="console-page">
        <div className="console-container">
          <header className="console-head">
            <div>
              <h1>我的求证</h1>
              <p>追踪你发起和参与的问题，以及这些贡献改变了什么</p>
            </div>
            <button className="console-close" type="button" onClick={onClose} aria-label="关闭">
              <X size={16} />
            </button>
          </header>
          <div className="console-stats">
            <div className="console-stat">
              <strong>{items.length}</strong>
              <span>我发起的问题</span>
            </div>
            <div className="console-stat">
              <strong>{firstHandCount}</strong>
              <span>第一手经历</span>
            </div>
            <div className="console-stat">
              <strong>{evidenceCount}</strong>
              <span>关联 Evidence</span>
            </div>
            <div className="console-stat">
              <strong>{unresolved}</strong>
              <span>仍在推进</span>
            </div>
          </div>
          <section className="console-section">
            <h2>我参与的问题</h2>
            <div className="console-list">
              {items.map((item) => (
                <button
                  className="console-row"
                  type="button"
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                >
                  <div>
                    <h3>{item.question}</h3>
                    <p>
                      {knowledgeLabels[item.knowledgeState]} · {item.evidenceCount} 条证据 ·{" "}
                      {item.missionCount} 个 Mission
                    </p>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </section>
          <section className="console-section">
            <h2>正在进行的 Mission</h2>
            {missions.length === 0 ? (
              <p className="empty-state">当前没有开放的证据缺口任务。</p>
            ) : null}
            <div className="console-list">
              {missions.map((mission) => (
                <button
                  className="console-row"
                  type="button"
                  key={mission.id}
                  onClick={() => onOpen(mission.investigationId)}
                >
                  <div>
                    <h3>{mission.title}</h3>
                    <p>
                      OPEN · {mission.evidenceCount} 条 Evidence · 来自当前 Knowledge Object
                      的证据缺口
                    </p>
                  </div>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </section>
          <section className="console-section">
            <h2>我的贡献</h2>
            <div className="console-list">
              {items.flatMap((item) =>
                listMockContributions(item.id)
                  .slice(0, 2)
                  .map((contribution) => (
                    <button
                      className="console-row"
                      type="button"
                      key={contribution.id}
                      onClick={() => onOpen(item.id)}
                    >
                      <div>
                        <h3>{contribution.summary}</h3>
                        <p>
                          {contributionLabels[contribution.type]} · @{contribution.author}
                          {contribution.impact ? ` · ${contribution.impact}` : ""}
                        </p>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  )),
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
export function InvestigationView({
  investigation,
  onJoin,
  onOrganizeDiscussion,
  creatingMission,
  outcome,
  onDismissOutcome,
}: {
  investigation: Investigation;
  onJoin: () => void;
  onOrganizeDiscussion: (discussionId: string) => void;
  creatingMission: boolean;
  outcome: { record: EvidenceRecord; receipt?: ImpactReceipt; before: KnowledgeStateStatus } | null;
  onDismissOutcome: () => void;
}) {
  const sources = useMemo(
    () => [...investigation.searches.zhihu.items, ...investigation.searches.global.items],
    [investigation],
  );
  const [showAllSources, setShowAllSources] = useState(false);
  const visibleSources = showAllSources ? sources : sources.slice(0, 4);
  const [contributions, setContributions] = useState<MockContribution[]>(() =>
    listMockContributions(investigation.id),
  );
  const [composerType, setComposerType] = useState<ContributionType | null>(null);

  function handleContribution(text: string) {
    if (!composerType) return;
    const nowValue = new Date().toISOString();
    setContributions((items) => [
      {
        id: `mock-local-${Date.now()}`,
        investigationId: investigation.id,
        type: composerType,
        author: "我",
        summary: text,
        createdAt: nowValue,
        ...(composerType === "EVIDENCE"
          ? { grade: "E1_FIRST_HAND", accepted: true, impact: "已进入待评估队列" }
          : {}),
      },
      ...items,
    ]);
    setComposerType(null);
  }

  return (
    <main className="workspace-page">
      <div className="workspace-container">
        <section className="investigation-hero">
          <div className="investigation-meta">
            <span>INVESTIGATION</span>
            <i />
            <span>{new Date(investigation.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <h1>{investigation.question}</h1>
          <div className="hero-status-row">
            <StatusBadge status={investigation.knowledgeState.status} />
            <span>{investigation.knowledgeState.evidenceCount} 条真人 Evidence</span>
            <span>{sources.length} 个公开来源</span>
          </div>
        </section>

        <section className="contribute-bar" aria-label="参与方式">
          <button
            className="contribute-entry"
            type="button"
            onClick={() => setComposerType("VIEWPOINT")}
          >
            <strong>
              <MessageCircle size={14} />
              补充观点
            </strong>
            <small>表达看法、补充背景，不直接改变 Knowledge State</small>
          </button>
          <button
            className="contribute-entry"
            type="button"
            onClick={() => setComposerType("COUNTEREXAMPLE")}
          >
            <strong>
              <CircleAlert size={14} />
              提供反例
            </strong>
            <small>指出当前 Claim 在哪些场景下不成立</small>
          </button>
          <button
            className="contribute-entry evidence"
            type="button"
            onClick={onJoin}
            disabled={creatingMission}
          >
            <strong>
              <CheckCircle2 size={14} />
              提交第一手经历
            </strong>
            <small>进入 Evidence 评估链路，影响 Knowledge State</small>
          </button>
        </section>

        {outcome ? (
          <EvidenceOutcome
            record={outcome.record}
            receipt={outcome.receipt}
            before={outcome.before}
            after={investigation.knowledgeState.status}
            onDismiss={onDismissOutcome}
          />
        ) : null}

        {investigation.discussionOrganizations.length > 0 ? (
          <section className="content-section organization-section">
            <div className="section-heading">
              <span className="section-icon known">
                <Bot size={16} />
              </span>
              <div>
                <h2>Agent 组织结果</h2>
                <p>基于讨论生成的分类、主张关系与证据缺口</p>
              </div>
            </div>
            <div className="organization-list">
              {investigation.discussionOrganizations.map((organization) => (
                <article className="organization-item" key={organization.discussionId}>
                  {organization.summary ? <p>{organization.summary}</p> : null}
                  <div className="organization-tags">
                    {organization.classifications.map((item) => (
                      <span key={`${organization.discussionId}-${item.label}`}>{item.label}</span>
                    ))}
                  </div>
                  {organization.missionRecommended ? (
                    <small>Agent 建议围绕当前 Evidence Gap 发起 Mission</small>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {investigation.discussions.length > 0 ? (
          <section className="content-section discussion-section">
            <div className="section-heading">
              <span className="section-icon known">
                <MessageCircle size={16} />
              </span>
              <div>
                <h2>人类讨论</h2>
                <p>来自参与者的原始经验与分歧；Agent 组织结果见下方</p>
              </div>
            </div>
            <div className="discussion-list">
              {investigation.discussions.map((discussion, index) => (
                <article
                  className="discussion-item"
                  key={`${discussion.authorLabel ?? "discussion"}-${index}`}
                >
                  <strong>{discussion.authorLabel ?? "社区参与者"}</strong>
                  <p>{discussion.content}</p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => onOrganizeDiscussion(discussion.id)}
                  >
                    让 Agent 组织这条讨论
                  </button>
                  <small>
                    {discussion.createdAt
                      ? new Date(discussion.createdAt).toLocaleString("zh-CN")
                      : "讨论内容"}
                  </small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="workspace-grid">
          <div className="evidence-column">
            <section className="content-section overview-section">
              <div className="section-heading">
                <span className="section-icon known">
                  <Search size={16} />
                </span>
                <div>
                  <h2>公开信息告诉了我们什么</h2>
                  <p>Agent 对知乎与全网检索结果的结构化整理</p>
                </div>
              </div>

              <div className="known-list">
                {investigation.evidenceState.known.map((item) => (
                  <div key={item}>
                    <CheckCircle2 size={17} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {investigation.evidenceState.disagreements.length > 0 ? (
                <div className="disagreement-box">
                  <span>仍有分歧</span>
                  {investigation.evidenceState.disagreements.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              ) : null}
            </section>

            <ClaimList
              title="当前可支持"
              items={investigation.knowledgeState.supported}
              variant="supported"
            />
            <ClaimList
              title="仍待验证"
              items={investigation.knowledgeState.unsupported}
              variant="unsupported"
            />

            {investigation.reevaluation ? (
              <section className="content-section reevaluation-section">
                <div className="section-heading">
                  <span className="section-icon known">
                    <Bot size={16} />
                  </span>
                  <div>
                    <h2>Agent 重评说明</h2>
                    <p>为什么 Knowledge State 发生或没有发生变化</p>
                  </div>
                </div>
                <p className="reevaluation-copy">{investigation.reevaluation.whyStateChanged}</p>
              </section>
            ) : null}

            <section className="content-section limitations-section">
              <div className="section-heading">
                <span className="section-icon limitation">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <h2>结论边界</h2>
                  <p>这些限制决定了当前结论不能被如何理解</p>
                </div>
              </div>
              <ul>
                {investigation.knowledgeState.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <ContributionsSection contributions={contributions} />

            <section className="content-section sources-section">
              <div className="section-heading source-heading">
                <span className="section-icon source">
                  <Globe2 size={16} />
                </span>
                <div>
                  <h2>检索来源</h2>
                  <p>
                    知乎：{provenanceLabels[investigation.searches.zhihu.provenance]} · 全网：
                    {provenanceLabels[investigation.searches.global.provenance]}
                  </p>
                </div>
              </div>
              <div className="source-list">
                {visibleSources.map((source) => (
                  <SourceCard source={source} key={source.id} />
                ))}
              </div>
              {sources.length > 4 ? (
                <button
                  className="show-more"
                  type="button"
                  onClick={() => setShowAllSources((value) => !value)}
                >
                  {showAllSources ? "收起来源" : `查看全部 ${sources.length} 个来源`}
                  <ChevronDown className={showAllSources ? "rotate" : ""} size={16} />
                </button>
              ) : null}
            </section>
          </div>

          <FrontierPanel
            investigation={investigation}
            onJoin={onJoin}
            creatingMission={creatingMission}
          />
        </div>
      </div>
      {composerType ? (
        <ContributionComposer
          type={composerType}
          onClose={() => setComposerType(null)}
          onSubmit={handleContribution}
        />
      ) : null}
    </main>
  );
}

export function getClientErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "发生了未知错误，请稍后重试。";
}

export default function HomePage() {
  const router = useRouter();
  const [question, setQuestion] = useState(GOLDEN_QUESTION);
  const [askSession, setAskSession] = useState(0);
  const [creatingInvestigation, setCreatingInvestigation] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [investigations, setInvestigations] = useState<MockFeedItem[]>(() =>
    listMockInvestigations(),
  );
  const [loadingInvestigations, setLoadingInvestigations] = useState(true);
  const [missions, setMissions] = useState<
    Array<{
      id: string;
      investigationId: string;
      title: string;
      status: "OPEN" | "CLOSED";
      evidenceCount: number;
    }>
  >([]);

  useEffect(() => {
    let active = true;
    listMissions()
      .then((items) => {
        if (active) setMissions(items);
      })
      .catch(() => {
        if (active) setMissions([]);
      });
    listInvestigations()
      .then((items) => {
        if (!active) return;
        if (items.length === 0) {
          setFeedNotice("演示数据 · 后端当前还没有公开求证，先展示 Mock 案例");
          return;
        }
        setInvestigations(
          items.map((item) => ({
            ...item,
            author: "Human Gateway Community",
            excerpt: "持续演化的 Knowledge Object",
            discussionCount: 0,
            firstHandCount: item.evidenceCount,
            topic: "AI Coding Circle",
            claims: [],
            conflictText: "查看当前分歧与限制",
            gapText: "查看当前 Evidence Gap",
          })),
        );
        setFeedNotice(null);
        setPageError(null);
      })
      .catch((error) => {
        if (!active) return;
        setPageError(null);
        setFeedNotice(`演示数据 · 未连接到求证服务（${getClientErrorMessage(error)}）`);
      })
      .finally(() => {
        if (active) setLoadingInvestigations(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [showComposer, setShowComposer] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "verify" | "search" | "mine">("home");
  const [activeCircle, setActiveCircle] = useState<string | null>(null);
  const [posts] = useState<MockPost[]>(() => listMockPosts());

  useEffect(() => {
    function syncFromUrl() {
      const hash = window.location.hash.replace("#", "");
      const params = new URLSearchParams(window.location.search);
      setActiveCircle(params.get("circle"));
      const presetQuestion = params.get("ask");
      if (presetQuestion) setQuestion(presetQuestion);
      if (hash === "search") {
        setShowComposer(true);
        setShowConsole(false);
        setActiveNav("search");
        return;
      }
      if (hash === "mine") {
        setShowConsole(true);
        setShowComposer(false);
        setActiveNav("mine");
        return;
      }
      if (hash === "verify") {
        setShowComposer(false);
        setShowConsole(false);
        setActiveNav("verify");
        return;
      }
      setShowComposer(false);
      setShowConsole(false);
      setActiveNav("home");
    }

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  function panelUrl(panel: "home" | "verify" | "search" | "mine", circle: string | null) {
    const query = circle ? `?circle=${encodeURIComponent(circle)}` : "";
    return panel === "home" ? `/${query}` : `/${query}#${panel}`;
  }

  function setPanel(panel: "home" | "verify" | "search" | "mine") {
    window.history.replaceState(null, "", panelUrl(panel, activeCircle));
    setShowComposer(panel === "search");
    setShowConsole(panel === "mine");
    setActiveNav(panel);
  }

  function selectCircle(slug: string | null) {
    setActiveCircle(slug);
    window.history.replaceState(null, "", panelUrl("home", slug));
    setShowComposer(false);
    setShowConsole(false);
    setActiveNav("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    selectCircle(null);
  }

  async function handleCreateInvestigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    setCreatingInvestigation(true);
    setAskSession((current) => current + 1);
    setPageError(null);
    try {
      const created = await createInvestigation(trimmedQuestion);
      setInvestigations((items) => [mockInvestigationToListItem(created), ...items]);
      router.push(`/investigation/${encodeURIComponent(created.id)}`);
    } catch (error) {
      const created = createMockInvestigation(trimmedQuestion);
      setInvestigations((items) => [mockInvestigationToListItem(created), ...items]);
      setFeedNotice(
        `后端未接受这次求证（${getErrorMessage(error)}），已改用本地演示数据。`,
      );
      router.push(`/investigation/${encodeURIComponent(created.id)}`);
    } finally {
      setCreatingInvestigation(false);
    }
  }

  return (
    <div className="app-shell">
      <AppHeader
        onReset={goHome}
        hasInvestigation={false}
        onSearch={() => setPanel("search")}
        onMyInvestigations={() => setPanel("mine")}
        onVerify={() => setPanel("verify")}
        activeNav={activeNav}
      />
      {activeNav === "verify" ? (
        <VerifyHome
          items={investigations}
          loading={loadingInvestigations}
          error={pageError}
          notice={feedNotice}
          onOpen={(id) => router.push(`/investigation/${encodeURIComponent(id)}`)}
          onAsk={() => setPanel("search")}
        />
      ) : (
        <PostsHome
          posts={posts}
          circleSlug={activeCircle}
          onSelectCircle={selectCircle}
          onOpenPost={(id) => router.push(`/post/${encodeURIComponent(id)}`)}
          onOpenInvestigation={(id) => router.push(`/investigation/${encodeURIComponent(id)}`)}
          verifyItems={investigations}
          verifyLoading={loadingInvestigations}
          notice={feedNotice}
          onAsk={() => setPanel("search")}
          onVerify={() => setPanel("verify")}
          onMine={() => setPanel("mine")}
        />
      )}
      {showComposer ? (
        <div className="composer-overlay">
          <AskView
            key={askSession}
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleCreateInvestigation}
            loading={creatingInvestigation}
            error={pageError}
            onClose={() => setPanel("home")}
          />
        </div>
      ) : null}
      {showConsole ? (
        <MyInvestigationsConsole
          items={investigations}
          onOpen={(id) => {
            setPanel("home");
            router.push(`/investigation/${encodeURIComponent(id)}`);
          }}
          onClose={() => setPanel("home")}
          missions={missions}
        />
      ) : null}
    </div>
  );
}
