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
import { ApiClientError } from "@/lib/api-client";
import {
  createMockInvestigation,
  listMockInvestigations,
  mockInvestigationToListItem,
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
  activeNav,
}: {
  onReset: () => void;
  hasInvestigation: boolean;
  onSearch?: () => void;
  onMyInvestigations?: () => void;
  activeNav?: "home" | "search" | "mine";
}) {
  const nav = activeNav ?? "home";
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={onReset} aria-label="返回求证首页">
          <span className="brand-mark">H</span>
          <span className="brand-name">知乎 · 求证 Agent</span>
        </button>
        <nav className="header-nav" aria-label="主导航">
          <button
            className={"nav-item" + (nav === "home" ? " active" : "")}
            type="button"
            onClick={onReset}
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

const topics = ["推荐", "AI", "科技", "编程", "教育", "职场", "数码", "更多"];

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
          <b>{item.firstHandCount === 0 ? "真实开发者经历" : "更多反例与边界"}</b>
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

function FeedHome({
  items,
  loading,
  error,
  onOpen,
  onAsk,
}: {
  items: MockFeedItem[];
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onAsk: () => void;
}) {
  const [activeTopic, setActiveTopic] = useState("推荐");
  const visibleItems =
    activeTopic === "推荐" || activeTopic === "更多"
      ? items
      : items.filter((item) => item.topic === activeTopic);
  return (
    <main className="feed-page">
      <div className="feed-container">
        <div className="feed-toolbar">
          <div className="topic-row" aria-label="话题分类">
            {topics.map((topic) => (
              <button
                className={topic === activeTopic ? "topic active" : "topic"}
                key={topic}
                type="button"
                onClick={() => setActiveTopic(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
          <button className="ask-trigger" type="button" onClick={onAsk}>
            <Sparkles size={16} />
            发起求证
          </button>
        </div>
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
        {!loading && !error && visibleItems.length === 0 ? (
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
          {visibleItems.map((item) => (
            <FeedCard item={item} onOpen={onOpen} key={item.id} />
          ))}
        </div>
        {visibleItems.length > 0 ? (
          <>
            <button className="load-more" type="button" disabled>
              ↓ 加载更多
            </button>
            <p className="load-more-end">— 没有更多了 —</p>
          </>
        ) : null}
      </div>
    </main>
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
            <span className="drawer-kicker">真人求证任务</span>
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
              <button className="primary-button" type="submit" disabled={!valid || submitting}>
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

export function InvestigationView({
  investigation,
  onJoin,
  creatingMission,
  outcome,
  onDismissOutcome,
}: {
  investigation: Investigation;
  onJoin: () => void;
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

        {outcome ? (
          <EvidenceOutcome
            record={outcome.record}
            receipt={outcome.receipt}
            before={outcome.before}
            after={investigation.knowledgeState.status}
            onDismiss={onDismissOutcome}
          />
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

            <section className="content-section sources-section">
              <div className="section-heading source-heading">
                <span className="section-icon source">
                  <Globe2 size={16} />
                </span>
                <div>
                  <h2>检索来源</h2>
                  <p>
                    {provenanceLabels[investigation.searches.zhihu.provenance]} · 知乎与全网分开呈现
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
  const [investigations, setInvestigations] = useState<MockFeedItem[]>(() =>
    listMockInvestigations(),
  );
  const [showComposer, setShowComposer] = useState(false);
  const [activeNav, setActiveNav] = useState<"home" | "search" | "mine">("home");

  async function handleCreateInvestigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    setCreatingInvestigation(true);
    setAskSession((current) => current + 1);
    setPageError(null);
    try {
      const created = createMockInvestigation(trimmedQuestion);
      setInvestigations((items) => [mockInvestigationToListItem(created), ...items]);
      router.push(`/investigation/${encodeURIComponent(created.id)}`);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setCreatingInvestigation(false);
    }
  }

  return (
    <div className="app-shell">
      <AppHeader
        onReset={() => {
          router.push("/");
          setActiveNav("home");
        }}
        hasInvestigation={false}
        onSearch={() => {
          setShowComposer(true);
          setActiveNav("search");
        }}
        onMyInvestigations={() => {
          setShowComposer(true);
          setActiveNav("mine");
        }}
        activeNav={activeNav}
      />
      <FeedHome
        items={investigations}
        loading={false}
        error={null}
        onOpen={(id) => router.push(`/investigation/${encodeURIComponent(id)}`)}
        onAsk={() => setShowComposer(true)}
      />
      {showComposer ? (
        <div className="composer-overlay">
          <AskView
            key={askSession}
            question={question}
            setQuestion={setQuestion}
            onSubmit={handleCreateInvestigation}
            loading={creatingInvestigation}
            error={pageError}
            onClose={() => setShowComposer(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
