"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, LoaderCircle } from "lucide-react";
import type { DiscoveryTopic } from "@human-api/contracts";
import { getDiscoveryTopics, prepareGoldenDemo } from "@/lib/api-client";
import { CommunityHeader, SourceMode, errorMessage } from "./community-ui";

export default function HomePage() {
  const [topics, setTopics] = useState<DiscoveryTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await prepareGoldenDemo();
        const value = await getDiscoveryTopics();
        if (!cancelled) setTopics(value);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <div className="app-shell">
      <CommunityHeader />
      <main className="hg-page">
        <section className="hg-hero">
          <span className="hg-eyebrow">
            <Bot size={16} /> AGENT 发现 · AI CODING
          </span>
          <h1>
            公开讨论已经很多。
            <br />
            <span>我们还缺你的那一次经历。</span>
          </h1>
          <p>
            Human Gateway 是一个由 Agent 整理、由真实经历推动的知识社区。Agent
            从知乎与公开内容中找到问题，整理共识与分歧，再邀请亲历者补上还不知道的部分。
          </p>
          <div className="hg-flow">
            <span>公开人类讨论</span>
            <i>→</i>
            <span>Agent 整理知识边界</span>
            <i>→</i>
            <span>你补充一次经历</span>
          </div>
        </section>
        <section aria-labelledby="discovery-title">
          <div className="hg-section-heading">
            <h2 id="discovery-title">Agent 正在关注</h2>
            <span>不是从空白问题开始</span>
          </div>
          {loading && (
            <div className="hg-loading" role="status">
              <LoaderCircle className="spin" size={20} />
              <p>
                Agent 正在读取公开讨论并整理主题。实时来源不可用时，会明确切换到缓存或演示快照。
              </p>
            </div>
          )}
          {error && (
            <div className="hg-error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setAttempt((v) => v + 1)}
              >
                重试加载主题
              </button>
              <p>未用前端 Mock 冒充已连接的后端。</p>
            </div>
          )}
          {topics.map((topic) => (
            <article className="hg-topic" key={topic.id}>
              <div className="hg-topic-main">
                <span className="hg-eyebrow">已形成的知识主题</span>
                <h2>{topic.title}</h2>
                <div className="hg-source-row">
                  <span>知乎</span>
                  <SourceMode mode={topic.provenance.zhihu} />
                  <span>全网</span>
                  <SourceMode mode={topic.provenance.global} />
                  <span>{topic.sourceCount} 条公开来源 · 由 Agent 规则整理</span>
                </div>
                <p>
                  {topic.summary.consensus[0] ?? "Agent 已整理公开内容，当前还不足以形成共识。"}
                </p>
                <div className="hg-topic-tension">
                  <strong>仍有分歧</strong>
                  <p>
                    {topic.summary.disagreements[0] ?? "尚缺足够的公开观点对照，不将沉默当作共识。"}
                  </p>
                </div>
              </div>
              <aside className="hg-topic-invitation">
                <span className="hg-eyebrow">还缺什么</span>
                <p>
                  {topic.activeInvitation?.description ??
                    topic.summary.unknowns[0] ??
                    "等待 Agent 明确下一步可求证的缺口。"}
                </p>
                <Link
                  className="primary-button"
                  href={`/investigation/${encodeURIComponent(topic.id)}`}
                >
                  看看讨论，分享经历 <ArrowRight size={17} />
                </Link>
                <small>先看已有讨论，再决定是否参与</small>
              </aside>
            </article>
          ))}
        </section>
        <footer className="hg-footer">
          知乎 / 公开内容是研究输入，不等于已验证证据。缓存和演示快照都会明确标记。
          <br />
          黑客松演示 · 不提供通用信息流、登录或推荐排序。
        </footer>
      </main>
    </div>
  );
}
