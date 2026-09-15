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
import { animate, createTimeline, stagger } from "animejs";
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
  chatRoute,
  listInvestigations,
  listMissions,
  getHotList,
  prepareGoldenDemo,
} from "@/lib/api-client";
import { ZhihuAuthControl } from "./community-ui";
import {
  listMockContributions,
  generatePostsFromHotList,
  mockInvestigationToListItem,
  type ContributionType,
  type MockContribution,
  type MockFeedItem,
} from "@/lib/mock-data";

const GOLDEN_QUESTION = "AI Coding 实际改变了初级开发者哪些工作？";
const searchExamples = [
  { label: "简单问题 · 直接回复", question: "HTTP 404 状态码是什么意思？", tone: "simple" },
  { label: "已有对应帖子", question: "AI Coding 会让初级程序员失业吗？", tone: "existing" },
  {
    label: "已有圈子 · 没有帖子",
    question: "AI Agent 会如何改变独立游戏开发者的日常工作？",
    tone: "circle",
  },
  {
    label: "没有圈子 · 没有帖子",
    question: "火星基地长期沙尘暴会如何影响普通人的日常生活？",
    tone: "new-circle",
  },
] as const;

type SearchRoute = "simple" | "existing" | "circle" | "new-circle";
function getSearchRoute(question: string): SearchRoute {
  if (
    /是什么|什么意思|代表什么|怎么用|定义/i.test(question) &&
    !/会不会|是否|影响|经历|如何改变/i.test(question)
  )
    return "simple";
  if (/AI Coding|初级程序员|AI学习/i.test(question)) return "existing";
  if (/AI Agent|独立游戏|游戏开发/i.test(question)) return "circle";
  return "new-circle";
}
function getSearchStages(route: SearchRoute): string[] {
  if (route === "simple") return ["理解问题", "判断为简单问题", "直接生成回复", "展示简洁答案"];
  if (route === "existing")
    return [
      "理解问题",
      "匹配对应圈子",
      "进入圈内查找帖子",
      "找到可回复帖子",
      "检索补充内容",
      "展示已有帖子",
    ];
  if (route === "circle")
    return [
      "理解问题",
      "匹配对应圈子",
      "进入圈内查找帖子",
      "确认没有可回复帖子",
      "检索知乎内容",
      "整合观点并创建新帖",
    ];
  return [
    "理解问题",
    "匹配对应圈子",
    "确认没有合适圈子",
    "创建新圈子",
    "检索知乎内容",
    "整合观点并创建首帖",
  ];
}

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
  onVerification,
  activeNav,
}: {
  onReset: () => void;
  hasInvestigation: boolean;
  onSearch?: () => void;
  onMyInvestigations?: () => void;
  onVerification?: () => void;
  activeNav?: "home" | "search" | "verify" | "mine";
}) {
  const nav = activeNav ?? "home";
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" type="button" onClick={onReset} aria-label="返回求证首页">
          <span className="brand-mark">H</span>
          <span className="brand-name">群知——人与 AI 共生的知识社区</span>
        </button>
        <nav className="header-nav" aria-label="主导航">
          <button
            className={"nav-item" + (nav === "home" ? " active" : "")}
            type="button"
            onClick={onReset}
          >
            圈子
          </button>
          <button
            className={"nav-item" + (nav === "verify" ? " active" : "")}
            type="button"
            onClick={onVerification}
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
          <ZhihuAuthControl />
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
        <div className="feed-kicker">
          <span className="kicker-line" />
          求证动态 <span className="kicker-dot">·</span> 持续更新
        </div>
        <h2>{item.question}</h2>
        <p className="feed-excerpt">{item.excerpt}</p>
        {item.sourceUrl ? (
          <div className="feed-source-badge">
            <ExternalLink size={12} />
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {item.sourceTitle
                ? item.sourceTitle.substring(0, 30)
                : "\u77e5\u4e4e\u70ed\u699c\u6765\u6e90"}
            </a>
          </div>
        ) : null}
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
            {item.evidenceCount} 条记录
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

function FeedHome({
  items,
  loading,
  error,
  notice,
  onOpen,
  onAsk,
  onMine,
}: {
  items: MockFeedItem[];
  loading: boolean;
  error: string | null;
  notice?: string | null;
  onOpen: (id: string) => void;
  onAsk: () => void;
  onMine: () => void;
}) {
  const [activeTopic, setActiveTopic] = useState("推荐");
  const [hotItems, setHotItems] = useState<Array<{ title: string; url: string; summary: string }>>(
    [],
  );
  const [hotListNotice, setHotListNotice] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<MockFeedItem[]>([]);
  const [generatingPosts, setGeneratingPosts] = useState(false);
  const [generateNotice, setGenerateNotice] = useState<string | null>(null);
  const mergedItems = [
    ...localItems,
    ...items.filter((i) => !localItems.find((li) => li.id === i.id)),
  ];
  const visibleItems =
    activeTopic === "推荐" || activeTopic === "更多"
      ? mergedItems
      : mergedItems.filter((item) => item.topic === activeTopic);
  useEffect(() => {
    getHotList(8)
      .then((response) => setHotItems(response.items))
      .catch((error) => {
        setHotListNotice(getErrorMessage(error));
        setHotItems([
          {
            title: "AI Coding 实际改变了初级开发者哪些工作？",
            url: "https://www.zhihu.com/search?q=AI%20Coding",
            summary: "Golden Demo 演示入口（后端未连接）",
          },
          {
            title: "大模型如何影响真实工作流程？",
            url: "https://www.zhihu.com/search?q=%E5%A4%A7%E6%A8%A1%E5%9E%8B",
            summary: "Golden Demo 演示入口（后端未连接）",
          },
          {
            title: "普通人如何判断 AI 工具是否真的有用？",
            url: "https://www.zhihu.com/search?q=AI%20%E5%B7%A5%E5%85%B7",
            summary: "Golden Demo 演示入口（后端未连接）",
          },
        ]);
      });
  }, []);
  async function handleGenerateFromHotList() {
    setGeneratingPosts(true);
    setGenerateNotice(null);
    try {
      const response = await getHotList(10);
      const newPosts = generatePostsFromHotList(response.items, 2);
      if (newPosts.length > 0) {
        setLocalItems((current) => [...newPosts, ...current]);
        const topics = [...new Set(newPosts.map((p) => p.topic))].join("、");
        setGenerateNotice(
          "Agent 自动从知乎热榜抓取，已生成 " +
            newPosts.length +
            " 个帖子（归入「" +
            topics +
            "」圈子），无需冷启动！",
        );
      }
    } catch {
      setGenerateNotice(null);
    } finally {
      setGeneratingPosts(false);
    }
  }
  return (
    <main className="feed-page">
      <div className="feed-container">
        <section className="agent-loop-card" aria-label="Agent 求证闭环">
          <div className="agent-loop-copy">
            <span className="agent-loop-kicker">
              <Bot size={14} /> 一起把问题弄清楚
            </span>
            <h1>从“大家都在说”到“我知道为什么”</h1>
            <p>先看看大家怎么说，再找还缺什么，邀请真正经历过的人补充，最后把新信息讲明白。</p>
          </div>
          <div className="agent-loop-steps">
            {[
              ["01", "先看大家怎么说", "整理已有讨论"],
              ["02", "找出还缺什么", "明确需要的答案"],
              ["03", "请经历过的人来答", "补充真实经历"],
              ["04", "把结论说清楚", "说明哪些变了"],
            ].map(([number, title, detail]) => (
              <div className="agent-loop-step" key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
          <button className="agent-loop-cta" type="button" onClick={onAsk}>
            <Sparkles size={15} /> 用一个问题跑通 Demo
          </button>
        </section>
        {hotItems.length > 0 ? (
          <section className="hot-list-card" aria-label="知乎热榜">
            <div className="hot-list-heading">
              <div>
                <span className="profile-kicker">LIVE FROM ZHIHU</span>
                <h2>知乎热榜</h2>
              </div>
              <span className="profile-muted">仅作为选题入口，不等同于证据</span>
            </div>
            <div className="hot-list-grid">
              {hotItems.map((item, index) => (
                <a
                  className="hot-list-item"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  key={item.url}
                >
                  <span className="hot-list-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{item.title}</strong>
                    {item.summary ? <small>{item.summary}</small> : null}
                  </span>
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </section>
        ) : hotListNotice ? (
          <div className="feed-notice">
            <Info size={16} /> 热榜暂时不可用：{hotListNotice}
          </div>
        ) : null}
        <div className="feed-hotlist-actions">
          <button
            className="hotlist-generate-btn"
            type="button"
            onClick={handleGenerateFromHotList}
            disabled={generatingPosts}
          >
            <Sparkles size={15} />
            {generatingPosts ? "正在生成..." : "从知乎热榜生成帖子"}
          </button>
          {generateNotice ? (
            <div className="feed-generate-notice" role="status">
              <Sparkles size={15} />
              <span>{generateNotice}</span>
            </div>
          ) : null}
          <div className="feed-no-coldstart-badge">
            <Sparkles size={13} />
            无需冷启动 · Agent 已从知乎自动创建帖子 · 试试点击按钮从热榜生成更多
          </div>
        </div>
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
        {notice ? (
          <div className="feed-notice" role="status">
            <Info size={17} />
            <span>{notice}</span>
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
            <FeedCard
              item={item}
              onOpen={(id) => {
                if (id.startsWith("hotgen-")) {
                  const genItem = mergedItems.find((vi) => vi.id === id);
                  if (genItem?.sourceUrl) {
                    try {
                      window.open(genItem.sourceUrl, "_blank", "noopener,noreferrer");
                    } catch {}
                    return;
                  }
                  // hotgen items cannot be opened in investigation page
                  return;
                }
                onOpen(id);
              }}
              key={item.id}
            />
          ))}
        </div>
        {visibleItems.length > 0 ? (
          <>
            <button className="load-more" type="button" onClick={onMine}>
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
  completedId,
  onOpenResult,
}: {
  question: string;
  setQuestion: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  onClose?: () => void;
  completedId?: string | null;
  onOpenResult?: (id: string) => void;
}) {
  const [loadingStep, setLoadingStep] = useState(0);
  const searchRoute = getSearchRoute(question);
  const stageCount = getSearchStages(searchRoute).length;

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(
      () => setLoadingStep((current) => Math.min(current + 1, stageCount - 1)),
      2200,
    );
    return () => window.clearInterval(timer);
  }, [loading, stageCount]);

  useEffect(() => {
    if (!loading) return;
    const timeline = createTimeline({ defaults: { ease: "out(4)" } });
    timeline
      .add(".agent-orbit", { rotate: 360, duration: 5200, loop: true })
      .add(".agent-core", { scale: [0.92, 1.08], opacity: [0.7, 1], duration: 900, loop: true }, 0)
      .add(
        ".search-particle",
        { translateY: [-8, 8], opacity: [0.35, 1], delay: stagger(90), duration: 900, loop: true },
        0,
      );
    return () => {
      timeline.revert();
    };
  }, [loading]);

  return (
    <main
      className={`ask-page ${loading ? "is-processing" : ""} ${completedId ? "has-result" : ""}`}
    >
      <section className="ask-stage">
        {onClose ? (
          <button className="ask-close" type="button" onClick={onClose} aria-label="关闭提问面板">
            <X size={18} />
          </button>
        ) : null}
        {!loading && !completedId ? (
          <>
            <div className="eyebrow">
              <Sparkles size={15} />
              让答案停在证据边界上
            </div>
            <h1>有些问题，搜索之后才真正开始。</h1>
            <p className="ask-description">
              Agent 先整理已有信息，再把尚未解决的部分交给真正经历过的人。
            </p>
          </>
        ) : null}

        {!loading && !completedId && (
          <form className="question-box" onSubmit={onSubmit}>
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
        )}

        {error ? (
          <div className="inline-error" role="alert">
            <CircleAlert size={17} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <SearchAgentWorkspace step={loadingStep} question={question} />
        ) : completedId ? (
          getSearchRoute(question) === "simple" ? (
            <DirectAnswerComplete question={question} onNew={onClose} />
          ) : (
            <SearchAgentComplete
              question={question}
              onOpen={() => onOpenResult?.(completedId)}
              onNew={onClose}
            />
          )
        ) : (
          <div className="search-examples" aria-label="三种搜索流程示例">
            <div className="search-examples-title">
              <Lightbulb size={16} />
              <span>快速测试三种结果</span>
            </div>
            <div className="search-example-list">
              {searchExamples.map((example) => (
                <button
                  className={`search-example search-example-${example.tone}`}
                  type="button"
                  key={example.tone}
                  onClick={() => setQuestion(example.question)}
                >
                  <span className="example-label">{example.label}</span>
                  <span className="example-question">{example.question}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
          </div>
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

function VerificationHome({
  items,
  missions,
  onClose,
}: {
  items: MockFeedItem[];
  missions: Array<{
    id: string;
    investigationId: string;
    title: string;
    status: "OPEN" | "CLOSED";
    evidenceCount: number;
  }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const cards = missions.length
    ? missions.map((mission) => ({
        mission,
        question: mission.title,
        gap: "缺少真实经历者的第一手观察",
        who: "最近亲身经历过的人",
      }))
    : [
        {
          mission: {
            id: "mock-mission-1",
            investigationId: items[0]?.id ?? "mock-ai-coding",
            title: "AI Coding 实际改变了初级开发者哪些工作？",
            status: "OPEN" as const,
            evidenceCount: 0,
          },
          question: "AI Coding 实际改变了初级开发者哪些工作？",
          gap: "缺少真实开发者在 AI Coding 下的工作变化观察",
          who: "最近亲身经历过的人",
        },
      ];
  return (
    <main className="verification-page">
      <div className="verification-container">
        <header className="verification-head">
          <div>
            <h1>帮一个问题找到答案</h1>
            <p>选择你亲身经历过的问题，分享一段真实经历。</p>
          </div>
          <button className="console-close" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="verification-grid">
          {cards.map(({ mission, question, gap, who }) => (
            <article className="verification-card" key={mission.id}>
              <div className="verification-card-top">
                {mission.status === "OPEN" ? (
                  <span className="mission-badge-open">可参与</span>
                ) : (
                  <span className="mission-badge-closed">已结束</span>
                )}
              </div>
              <h2>{question}</h2>
              <p className="verification-card-gap">{gap}</p>
              <div className="verification-card-who">
                适合：<strong>{who}</strong>
              </div>
              <button
                className="verification-action"
                type="button"
                disabled={mission.status !== "OPEN"}
                onClick={() => router.push(`/mission/${encodeURIComponent(mission.id)}`)}
              >
                分享我的经历 <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
function SearchAgentComplete({
  question,
  onOpen,
  onNew,
}: {
  question: string;
  onOpen: () => void;
  onNew?: () => void;
}) {
  useEffect(() => {
    animate(".complete-mark", {
      scale: [0.6, 1],
      rotate: [-18, 0],
      opacity: [0, 1],
      duration: 650,
      ease: "out(4)",
    });
    animate(".complete-card", {
      translateY: [18, 0],
      opacity: [0, 1],
      duration: 500,
      delay: 180,
      ease: "out(4)",
    });
  }, []);
  return (
    <section className="agent-complete" aria-live="polite">
      <div className="complete-mark">✓</div>
      <span className="workspace-kicker">已准备好</span>
      <h2>这个问题已经可以开始求证</h2>
      <div className="complete-card">
        <strong>{question}</strong>
        <p className="complete-note">已有公开讨论，进入帖子查看结论与待补充的真实经验。</p>
        <div className="complete-actions">
          <button className="submit-question complete-primary" type="button" onClick={onOpen}>
            进入求证
          </button>
          {onNew ? (
            <button className="complete-secondary" type="button" onClick={onNew}>
              换个问题
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DirectAnswerComplete({ question, onNew }: { question: string; onNew?: () => void }) {
  useEffect(() => {
    animate(".direct-answer-card", {
      translateY: [16, 0],
      opacity: [0, 1],
      duration: 550,
      ease: "out(4)",
    });
  }, []);
  return (
    <section className="direct-answer-screen" aria-live="polite">
      <div className="direct-answer-card">
        <span className="direct-answer-label">直接回答</span>
        <h2>{question}</h2>
        <p>
          HTTP 404 表示请求的资源不存在。通常是页面、接口或文件没有找到，可能原因包括 URL
          写错、资源已删除，或服务器路由没有配置。
        </p>
        {onNew ? (
          <button className="submit-question complete-primary" type="button" onClick={onNew}>
            继续提问
          </button>
        ) : null}
      </div>
    </section>
  );
}

function SearchAgentWorkspace({ step, question }: { step: number; question: string }) {
  const route = getSearchRoute(question);
  const routeMeta = {
    simple: {
      label: "DIRECT ANSWER",
      title: "直接回答这个问题",
      color: "green",
      detail: "问题明确，无需匹配圈子或检索社区内容",
    },
    existing: {
      label: "MATCH FOUND",
      title: "复用已有问题",
      color: "blue",
      detail: "已找到高度匹配的社区帖子，不重复创建",
    },
    circle: {
      label: "CIRCLE FOUND",
      title: "在 AI 圈子创建新问题",
      color: "violet",
      detail: "已有 AI 圈子，但没有完全匹配的帖子",
    },
    "new-circle": {
      label: "NEW SPACE",
      title: "创建新圈子与问题",
      color: "amber",
      detail: "没有匹配圈子，Agent 将先建立新的讨论空间",
    },
  }[route];
  const stages = getSearchStages(route);
  const active = Math.min(step, stages.length - 1);
  const visibleStages =
    route === "simple" ? stages.slice(0, Math.min(active + 1, 2)) : stages.slice(0, active + 1);
  const hasDecision = active >= 1;
  const [typed, setTyped] = useState("");
  const typeLine =
    route === "simple"
      ? active === 0
        ? "拆解问题语义…"
        : active === 1
          ? "判断完成：这是一个可直接回答的问题"
          : "正在生成简洁回复…"
      : active === 0
        ? "拆解问题语义…"
        : active === 1
          ? "正在匹配最合适的圈子…"
          : route === "existing" && active === 2
            ? "圈子已找到：正在进入圈内查找帖子…"
            : route === "existing" && active === 3
              ? "找到可回复帖子：准备补充相关知识…"
              : route === "circle" && active === 2
                ? "圈子已找到：正在进入圈内查找帖子…"
                : route === "circle" && active === 3
                  ? "圈内没有可回复帖子：转入创建流程…"
                  : route === "new-circle" && active === 2
                    ? "没有找到合适圈子：准备创建新空间…"
                    : route === "new-circle" && active === 3
                      ? "新圈子正在生成…"
                      : active < 5
                        ? "知乎内容流入：观点正在分层…"
                        : "新的求证入口已生成";
  useEffect(() => {
    const reset = window.setTimeout(() => setTyped(""), 0);
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(typeLine.slice(0, index));
      if (index >= typeLine.length) window.clearInterval(timer);
    }, 52);
    return () => {
      window.clearTimeout(reset);
      window.clearInterval(timer);
    };
  }, [typeLine]);
  useEffect(() => {
    animate(".stage-card", {
      translateY: [22, 0],
      scale: [0.88, 1],
      opacity: [0, 1],
      delay: stagger(110, { grid: [3, 2], from: "center" }),
      duration: 700,
      ease: "out(4)",
    });
    animate(".search-particle", {
      scale: [0.2, 1.8],
      opacity: [0.15, 1],
      delay: stagger(45, { grid: [7, 1], from: "center" }),
      duration: 850,
      loop: true,
      alternate: true,
      ease: "inOutSine",
    });
    animate(".matrix-cell", {
      scale: [0, 1],
      opacity: [0, 0.9],
      delay: stagger(35, { grid: [12, 4], from: "center" }),
      duration: 500,
      loop: true,
      alternate: true,
      ease: "inOutQuad",
    });
    animate(".route-beam", {
      strokeDashoffset: [180, 0],
      opacity: [0.1, 1],
      duration: 1200,
      loop: true,
      ease: "linear",
    });
  }, [step]);
  return (
    <section className={`agent-workspace route-surface route-${route}`} aria-live="polite">
      <div className="matrix-bg" aria-hidden="true">
        {Array.from({ length: 48 }).map((_, i) => (
          <i className="matrix-cell" key={i} />
        ))}
      </div>
      <div className="agent-workspace-head">
        <div className="agent-visual">
          <div className="agent-orbit" />
          <svg className="route-beam" viewBox="0 0 100 20" aria-hidden="true">
            <path d="M2 10 C28 0 68 20 98 10" />
          </svg>
          <div className="agent-core">✦</div>
          {Array.from({ length: 7 }).map((_, index) => (
            <i
              className="search-particle"
              key={index}
              style={{ transform: `rotate(${index * 51}deg) translateY(-47px)` }}
            />
          ))}
        </div>
        <div>
          <span className={`workspace-kicker ${hasDecision ? `route-${routeMeta.color}` : ""}`}>
            {hasDecision ? `${routeMeta.label} · ` : "ANALYZING · "}AGENT LIVE WORKSPACE
          </span>
          <h2>
            {active === 0 ? "正在理解问题" : active === 1 ? "正在判断问题类型" : routeMeta.title}
          </h2>
          <p>
            {active === 0
              ? "提取主题、对象和关键词，暂不预设后续路径"
              : active === 1
                ? "先判断圈子，不提前判断帖子或创建动作"
                : routeMeta.detail}
          </p>
        </div>
        <span className="workspace-count">
          {active + 1} / {stages.length}
        </span>
      </div>
      <div className="agent-question-chip">“{question || "正在分析你的问题"}”</div>
      <div className="type-line">
        <span className="type-prompt">›</span>
        {typed}
        <span className="type-cursor" />
      </div>
      <div className="branch-map single-route" aria-label="Agent 当前决策路径">
        <div className="branch-node branch-origin">问题</div>
        <div className="branch-line" />
        {active > 1 ? (
          <div className="branch-node selected">
            {route === "simple"
              ? "直接回复"
              : route === "existing"
                ? "已有圈子 · 展示帖子"
                : route === "circle"
                  ? "已有圈子 · 创建新帖"
                  : "新圈子 · 创建新帖"}
          </div>
        ) : (
          <div className="branch-node pending">等待判断结果</div>
        )}
      </div>
      <div className="agent-stage-grid">
        {visibleStages.map((stage, index) => (
          <div
            className={`stage-card ${index < active ? "done" : ""} ${index === active ? "active" : ""}`}
            key={`${stage}-${index}`}
          >
            <span className="stage-icon">
              {index < active ? "✓" : ["✦", "⌕", "◈", "↗", "◌", "＋"][index]}
            </span>
            <div>
              <strong>{stage}</strong>
              <small>
                {index === 1 && index === active
                  ? route === "existing"
                    ? "发现 1 个高度匹配问题"
                    : "暂未找到完全匹配问题"
                  : index === 2 && index === active && route === "new-circle"
                    ? "AI 与职业变化 · 新空间"
                    : routeMeta.detail}
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="agent-stream">
        <span className="stream-dot" />
        {route === "simple"
          ? active < 2
            ? "正在判断是否可以直接回答…"
            : "Agent 正在生成直接回复…"
          : active === 0
            ? "关键词正在从问题中析出…"
            : active === 1
              ? route === "existing"
                ? "匹配成功 · 现有帖子正在聚焦"
                : "未找到完全匹配 · 分支已展开"
              : route === "existing"
                ? "相关知乎内容正在补充到现有问题…"
                : active === 2 && route === "new-circle"
                  ? "圈子节点正在生成…"
                  : active < 4
                    ? "知乎内容正在汇入，来源正在去重…"
                    : active === 4
                      ? "观点正在聚类，分歧被标记…"
                      : "帖子正在写入目标圈子…"}
      </div>
    </section>
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
                      {knowledgeLabels[item.knowledgeState]} · {item.evidenceCount} 条记录 ·{" "}
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
            <span>求证任务</span>
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
                    <p>为什么结论发生了变化</p>
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
  const [investigations, setInvestigations] = useState<MockFeedItem[]>([]);
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
    async function loadCommunity() {
      try {
        let missionItems = await listMissions();
        if (missionItems.length === 0) {
          await prepareGoldenDemo();
          missionItems = await listMissions();
        }
        if (active) setMissions(missionItems);
      } catch {
        if (active) setMissions([]);
      }
    }
    void loadCommunity();
    listInvestigations()
      .then((items) => {
        if (!active) return;

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
        setFeedNotice(`无法加载研究帖子（${getClientErrorMessage(error)}），请检查服务后重试。`);
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
  const [activeNav, setActiveNav] = useState<"home" | "search" | "verify" | "mine">("home");
  const [completedInvestigationId, setCompletedInvestigationId] = useState<string | null>(null);

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      if (hash === "search") {
        setShowComposer(true);
        setShowConsole(false);
        setActiveNav("search");
        return;
      }
      if (hash === "verify") {
        setShowComposer(false);
        setShowConsole(false);
        setActiveNav("verify");
        return;
      }
      if (hash === "mine") {
        setShowConsole(true);
        setShowComposer(false);
        setActiveNav("mine");
        return;
      }
      setShowComposer(false);
      setShowConsole(false);
      setActiveNav("home");
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function setPanel(panel: "home" | "search" | "verify" | "mine") {
    window.history.replaceState(null, "", panel === "home" ? "/" : `/#${panel}`);
    setShowComposer(panel === "search");
    setShowConsole(panel === "mine");
    setActiveNav(panel);
    if (panel !== "search") setCompletedInvestigationId(null);
  }

  function goHome() {
    setPanel("home");
    router.push("/");
  }

  async function handleCreateInvestigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    setCreatingInvestigation(true);
    setCompletedInvestigationId(null);
    setAskSession((current) => current + 1);
    setPageError(null);
    try {
      // First check if a similar investigation already exists
      const route = await chatRoute(trimmedQuestion);
      if (route.kind === "MATCHED_INVESTIGATION") {
        setCreatingInvestigation(false);
        router.push(`/investigation/${encodeURIComponent(route.investigationId)}`);
        return;
      }
      // Not matched - create a new investigation
      const created = await createInvestigation(trimmedQuestion);
      setInvestigations((items) => [mockInvestigationToListItem(created), ...items]);
      setCompletedInvestigationId(created.id);
    } catch (error) {
      setFeedNotice(`后端未接受这次求证（${getErrorMessage(error)}），请检查服务后重试。`);
      setPageError(getErrorMessage(error));
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
        onVerification={() => setPanel("verify")}
        activeNav={activeNav}
      />
      {activeNav !== "verify" ? (
        <FeedHome
          items={investigations}
          loading={loadingInvestigations}
          error={pageError}
          notice={feedNotice}
          onOpen={(id) => {
            if (id.startsWith("hotgen-")) {
              const item = investigations.find((i) => i.id === id);
              if (item?.sourceUrl) {
                try {
                  window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
                } catch {}
                return;
              }
              return;
            }
            router.push(`/investigation/${encodeURIComponent(id)}`);
          }}
          onAsk={() => setPanel("search")}
          onMine={() => setPanel("mine")}
        />
      ) : (
        <VerificationHome
          items={investigations}
          missions={missions}
          onClose={() => setPanel("home")}
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
            completedId={completedInvestigationId}
            onOpenResult={(id) => {
              setPanel("home");
              router.push(`/investigation/${encodeURIComponent(id)}`);
            }}
            onClose={() => setPanel("home")}
          />
        </div>
      ) : null}
      {showConsole ? (
        <MyInvestigationsConsole
          items={investigations}
          onOpen={(id) => {
            if (id.startsWith("hotgen-")) return;
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
