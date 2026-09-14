"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, Check, LoaderCircle, X } from "lucide-react";
import type {
  KnowledgeObjectProjection,
  ConversationDraft,
  EvidenceIntakeResponse,
  EvidenceMission,
  ImpactReceipt,
  KnowledgeStateStatus,
  SearchProvenance,
} from "@human-api/contracts";
import { confirmObservation, prepareConversationDraft } from "@/lib/api-client";
import samples from "../../../fixtures/golden-case/conversation-samples.json";

export const knowledgeLabels: Record<KnowledgeStateStatus, string> = {
  UNRESOLVED: "还需要亲历者补充",
  EARLY_EVIDENCE: "已有早期证据，仍不能外推",
  SUPPORTED_WITH_LIMITATIONS: "在明确条件下得到支持",
};
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求没有完成，请重试。";
}
export function CommunityHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">H</span>
          <span className="brand-name">Human Gateway</span>
        </Link>
        <span className="hg-header-note">从公开讨论，到共同理解</span>
        <Link className="quiet-button" href="/">
          发现
        </Link>
      </div>
    </header>
  );
}
export function SourceMode({ mode }: { mode: SearchProvenance }) {
  return (
    <span className={`hg-mode hg-mode-${mode.toLowerCase()}`}>
      {mode === "LIVE"
        ? "LIVE · 实时检索"
        : mode === "CACHE"
          ? "CACHE · 历史缓存"
          : "GOLDEN_FIXTURE · 公开内容演示快照"}
    </span>
  );
}
export function Understanding({ summary }: { summary: KnowledgeObjectProjection["summary"] }) {
  return (
    <div className="hg-understanding">
      {[
        ["大家比较一致", summary.consensus],
        ["仍有分歧", summary.disagreements],
        ["还不知道", summary.unknowns],
      ].map(([title, lines]) => (
        <section key={title as string}>
          <h3>{title as string}</h3>
          {(lines as string[]).length ? (
            <ul>
              {(lines as string[]).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>现有来源尚不足以整理这一部分，不代表已经达成共识。</p>
          )}
        </section>
      ))}
    </div>
  );
}
export function Receipt({ receipt, demoSample }: { receipt: ImpactReceipt; demoSample?: boolean }) {
  const changed = receipt.stateBefore !== receipt.stateAfter;
  return (
    <section className={`hg-receipt ${receipt.accepted ? "accepted" : "rejected"}`} role="status">
      <span className="hg-eyebrow">
        你的贡献回执 {demoSample ? "· GOLDEN_FIXTURE 合成示例，不是真人投稿" : "· 用户确认的经历"}
      </span>
      <h2>
        {!receipt.accepted
          ? "已收到，但暂未纳入证据"
          : changed
            ? "你的经历让这个问题多了一份早期证据"
            : "你的经历被采纳了，但整体判断没有改变"}
      </h2>
      <p>
        {!receipt.accepted
          ? "这次内容还缺少与邀请相关的具体亲历事实。观点仍然有价值，但不能代替可核对的经历。"
          : changed
            ? "这次个人观察进入了服务端评估。它补充了当前知识边界，但不代表所有初级开发者的情况。"
            : "新增观察补充了这个缺口的证据，但尚不足以把有限样本变成普遍结论。没有改变，也是一种诚实的反馈。"}
      </p>
      <p>
        <strong>现在的判断：</strong>
        {knowledgeLabels[receipt.stateAfter]}
      </p>
      {receipt.contribution && (
        <div>
          <h3>{receipt.accepted ? "这次记录了什么" : "为什么没有纳入"}</h3>
          {receipt.contribution.observation && (
            <blockquote>{receipt.contribution.observation}</blockquote>
          )}
          <p>{receipt.contribution.explanation}</p>
          <p className="hg-note">{receipt.contribution.boundary}</p>
          <a href="#community-contributions">回到主题，查看大家留下的依据</a>
        </div>
      )}
      {receipt.stillMissing.length > 0 && (
        <details>
          <summary>仍然缺少什么</summary>
          <ul>
            {receipt.stillMissing.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>查看评估依据与技术详情</summary>
        <p>{receipt.impactSummary}</p>
        <pre>{JSON.stringify(receipt, null, 2)}</pre>
      </details>
    </section>
  );
}

export function ConversationDrawer({
  mission,
  onClose,
  onComplete,
}: {
  mission: EvidenceMission;
  onClose: () => void;
  onComplete: (result: EvidenceIntakeResponse) => void;
}) {
  const [draft, setDraft] = useState<ConversationDraft | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [summary, setSummary] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleIndex, setSampleIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    opener.current = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let cancelled = false;
    prepareConversationDraft(mission.id, [])
      .then((value) => {
        if (!cancelled) setDraft(value);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    dialog.current?.focus();
    return () => {
      cancelled = true;
      document.body.style.overflow = overflow;
      opener.current?.focus();
    };
  }, [mission.id]);
  async function advance() {
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    const next = [...answers, input.trim()];
    try {
      const value = await prepareConversationDraft(mission.id, next);
      setDraft(value);
      setAnswers(next);
      setInput(sampleIndex === null ? "" : (samples[sampleIndex]?.turns[next.length] ?? ""));
      if (!value.question) {
        setSummary(value.summary);
        setReview(true);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmObservation(mission.id, {
        confirmed: true,
        summary,
        demoSample: sampleIndex !== null,
      });
      onComplete(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="drawer-layer">
      <button
        className="drawer-backdrop"
        type="button"
        disabled={busy}
        onClick={onClose}
        aria-label="取消贡献"
      />
      <div
        className="mission-drawer hg-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-title"
        ref={dialog}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) onClose();
          if (event.key === "Tab") {
            const nodes = dialog.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled), textarea, input, summary, a[href]",
            );
            if (!nodes?.length) return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === dialog.current)
            ) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="drawer-header">
          <div>
            <span className="drawer-kicker">
              Agent 邀请 · {review ? "请你确认" : "一次亲历就有价值"}
            </span>
            <h2 id="conversation-title">聊聊你的真实经历</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="取消贡献"
          >
            <X size={20} />
          </button>
        </header>
        <div className="drawer-content hg-conversation">
          <p className="hg-note">
            {draft?.limitations[0] ?? "正在读取邀请…"} 不需要提供姓名或敏感材料。
          </p>
          {!review && (
            <>
              <div className="hg-chat-agent">
                <Bot size={20} />
                <p>{draft?.question ?? "准备中…"}</p>
              </div>
              {answers.length > 0 && (
                <details>
                  <summary>你已经说过的内容（{answers.length} 轮）</summary>
                  {answers.map((answer, i) => (
                    <p className="hg-chat-user" key={i}>
                      {answer}
                    </p>
                  ))}
                </details>
              )}
              <label className="hg-input-label" htmlFor="conversation-answer">
                {answers.length ? `补充背景 · 最多两次追问` : "你的经历"}
              </label>
              <textarea
                id="conversation-answer"
                className="conversation-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="用自己的话说就好，支持、反例或没有变化都欢迎。"
                rows={7}
                maxLength={6000}
                disabled={busy}
              />
              <div className="conversation-actions">
                {answers.length > 0 && (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      setSummary(draft?.summary ?? answers.join("\n"));
                      setReview(true);
                    }}
                  >
                    跳过追问，确认已有内容
                  </button>
                )}
                <button
                  type="button"
                  className="primary-button"
                  onClick={advance}
                  disabled={busy || !draft || !input.trim()}
                >
                  {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}{" "}
                  {busy ? "正在整理" : "发送"}
                </button>
              </div>
              {answers.length === 0 && (
                <details className="hg-demo-samples">
                  <summary>演示者工具：使用明确标记的合成示例</summary>
                  <p>
                    以下不是真人投稿。依次演示采纳、拒绝、采纳但不变；不要把示例当作真实调研结果。
                  </p>
                  {samples.map((sample, i) => (
                    <button
                      className="secondary-button"
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        setSampleIndex(i);
                        setInput(sample.turns[0]);
                      }}
                    >
                      {i + 1}. {sample.label}
                    </button>
                  ))}
                </details>
              )}
            </>
          )}
          {review && (
            <>
              <h3>这是你的原话摘要，请确认或修改</h3>
              <p>仅最终确认的文字会提交。删除的事实不会被偷偷保留；不确认就不会写入证据。</p>
              <label htmlFor="observation-summary" className="hg-input-label">
                可编辑的事实摘要
              </label>
              <textarea
                id="observation-summary"
                className="conversation-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={10}
                maxLength={18000}
                disabled={busy}
              />
              <div className="conversation-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={onClose}
                  type="button"
                >
                  取消，不提交
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy || !summary.trim()}
                  onClick={confirm}
                >
                  {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{" "}
                  {busy ? "服务端正在评估" : "确认并提交"}
                </button>
              </div>
            </>
          )}
          {sampleIndex !== null && (
            <p className="hg-sample-label">GOLDEN_FIXTURE · 当前为合成示例，不是真人经历。</p>
          )}
          {error && (
            <div role="alert" className="hg-error">
              {error}
              {!draft && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    prepareConversationDraft(mission.id, [])
                      .then(setDraft)
                      .catch((e) => setError(errorMessage(e)));
                  }}
                >
                  重试读取邀请
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
