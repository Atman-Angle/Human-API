"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, LoaderCircle, Send, X } from "lucide-react";
import type {
  EvidenceMission,
  EvidenceSubmission,
  EvidenceRecord,
  MissionDetail,
  ImpactReceipt,
} from "@human-api/contracts";
import { submitEvidence, getMission, ApiClientError } from "@/lib/api-client";
import { AppHeader } from "../../page";

interface EvidenceFormState {
  participantType: string;
  timeframe: string;
  experience: string;
  task: string;
  aiRole: string;
  humanJudgment: string;
  artifactUrl: string;
}

const emptyForm: EvidenceFormState = {
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
  return "出错了，请稍后重试。";
}

function OutcomePanel({
  record,
  onDismiss,
}: {
  record: { record: EvidenceRecord; receipt: ImpactReceipt };
  onDismiss: () => void;
}) {
  const accepted = record.receipt.accepted;
  return (
    <div className="outcome-overlay">
      <div className="outcome-card">
        <button className="outcome-close-btn" onClick={onDismiss}>
          <X size={18} />
        </button>
        <div className={`outcome-icon-lg ${accepted ? "accepted" : "rejected"}`}>
          {accepted ? <CheckCircle2 size={32} /> : <CircleAlert size={32} />}
        </div>
        <h2>{accepted ? "你的经历已纳入求证" : "暂未匹配当前缺口"}</h2>
        <p>{record.receipt.impactSummary ?? record.record.gradeReason}</p>
        {record.receipt.stillMissing?.length > 0 && (
          <p className="outcome-missing">仍然需要：{record.receipt.stillMissing.join("、")}</p>
        )}
        <button className="primary-button" onClick={onDismiss}>
          返回
        </button>
      </div>
    </div>
  );
}

export default function MissionClient({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ record: EvidenceRecord; receipt: ImpactReceipt } | null>(
    null,
  );
  const [form, setForm] = useState<EvidenceFormState>({ ...emptyForm });
  const [missionDetail, setMissionDetail] = useState<MissionDetail | null>(null);
  const [loadingMission, setLoadingMission] = useState(true);

  useEffect(() => {
    getMission(missionId)
      .then((detail) => {
        setMissionDetail(detail);
        setLoadingMission(false);
      })
      .catch((err) => {
        console.error("Failed to load mission:", err);
        setLoadingMission(false);
      });
  }, [missionId]);

  // Fallback mission since listMissions may not return full detail
  const fallbackMission: EvidenceMission = {
    id: missionId,
    investigationId: "mock-ai-coding",
    evidenceGapId: "mock-gap",
    title: "AI Coding 实际改变了初级开发者哪些工作？",
    description: "缺少真实开发者在 AI Coding 下的工作变化观察。请记录一次具体、可回忆的真实经历。",
    qualification: ["最近 30 天内亲身经历过该场景的开发者"],
    questions: [
      {
        id: "participantType",
        kind: "SINGLE_SELECT",
        prompt: "你的身份是什么？",
        options: ["最近 30 天内亲身经历过该场景的开发者"],
        required: true,
      },
      {
        id: "timeframe",
        kind: "SINGLE_SELECT",
        prompt: "发生时间？",
        options: ["最近 7 天", "最近 30 天", "更早"],
        required: true,
      },
      { id: "task", kind: "SHORT_TEXT", prompt: "具体发生在什么任务或场景？", required: true },
      { id: "aiRole", kind: "SHORT_TEXT", prompt: "当时发生了什么变化？", required: true },
      { id: "humanJudgment", kind: "SHORT_TEXT", prompt: "你最后如何判断或处理？", required: true },
    ],
    status: "OPEN",
    estimatedSeconds: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mission = missionDetail?.mission ?? fallbackMission;

  function updateField<K extends keyof EvidenceFormState>(field: K, value: EvidenceFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const submission: EvidenceSubmission = {
        statement: `${form.task.trim()}；${form.aiRole.trim()}；${form.humanJudgment.trim()}`,
        participantType: form.participantType,
        experience: `${form.timeframe}。${form.experience.trim()}`,
        task: form.task.trim(),
        aiRole: form.aiRole.trim(),
        humanJudgment: form.humanJudgment.trim(),
        ...(form.artifactUrl.trim() ? { artifactUrl: form.artifactUrl.trim() } : {}),
      };
      const result = await submitEvidence(missionId, submission);
      setOutcome({ record: result.record, receipt: result.receipt });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const isValid =
    form.participantType &&
    form.experience.trim().length >= 2 &&
    form.task.trim().length >= 2 &&
    form.aiRole.trim().length >= 2 &&
    form.humanJudgment.trim().length >= 2;

  if (loadingMission && !missionDetail) {
    return (
      <div className="app-shell">
        <AppHeader onReset={() => router.push("/")} hasInvestigation={false} />
        <main className="mission-page">
          <p>正在加载任务…</p>
        </main>
      </div>
    );
  }

  if (outcome) {
    return (
      <div className="app-shell">
        <AppHeader onReset={() => router.push("/")} hasInvestigation={false} />
        <OutcomePanel record={outcome} onDismiss={() => router.push("/")} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader onReset={() => router.push("/")} hasInvestigation={false} />
      <main className="mission-page">
        <div className="mission-page-inner">
          <button className="mission-back" onClick={() => router.push("/")}>
            ← 返回
          </button>

          <header className="mission-header">
            <span className="mission-badge">分享你的经历</span>
            <h1>{mission.title}</h1>
            <p className="mission-desc">{mission.description}</p>
          </header>

          <div className="mission-qualification">
            <span>适合谁回答？</span>
            <strong>{mission.qualification.join("、")}</strong>
          </div>

          {mission.status === "CLOSED" ? (
            <div className="mission-closed-notice">
              <CircleAlert size={16} />
              这个问题已关闭，暂时不能提交新回答。
            </div>
          ) : null}

          <form className="mission-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>关于你</h2>

              <div className="form-row">
                <label className="form-field">
                  <span>你的身份</span>
                  <select
                    value={form.participantType}
                    onChange={(e) => updateField("participantType", e.target.value)}
                    required
                  >
                    <option value="">请选择</option>
                    {mission.qualification.map((item) => (
                      <option value={item} key={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>发生时间</span>
                  <select
                    value={form.timeframe}
                    onChange={(e) => updateField("timeframe", e.target.value)}
                  >
                    <option>最近 24 小时</option>
                    <option>最近 7 天</option>
                    <option>最近 30 天</option>
                    <option>更早</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-section">
              <h2>你的经历</h2>
              <p className="form-section-hint">
                请描述一次具体的真实经历，不需要写完整的分析文章。
              </p>

              <label className="form-field form-field-wide">
                <span>背景</span>
                <textarea
                  value={form.experience}
                  onChange={(e) => updateField("experience", e.target.value)}
                  placeholder="例如：我在实习项目中持续使用 Claude Code 完成后端开发"
                  rows={2}
                  required
                />
              </label>

              <label className="form-field form-field-wide">
                <span>具体是什么场景？</span>
                <textarea
                  value={form.task}
                  onChange={(e) => updateField("task", e.target.value)}
                  placeholder="例如：接口测试、异常场景和边界条件"
                  rows={2}
                  required
                />
              </label>

              <label className="form-field form-field-wide">
                <span>AI 做了什么？</span>
                <textarea
                  value={form.aiRole}
                  onChange={(e) => updateField("aiRole", e.target.value)}
                  placeholder="例如：自动生成测试用例、处理边角情况"
                  rows={2}
                  required
                />
              </label>

              <label className="form-field form-field-wide">
                <span>你最后怎么判断的？</span>
                <textarea
                  value={form.humanJudgment}
                  onChange={(e) => updateField("humanJudgment", e.target.value)}
                  placeholder="例如：检查了边界条件后，确认 AI 生成的内容可以信任"
                  rows={2}
                  required
                />
              </label>
            </div>

            <div className="form-section form-section-light">
              <label className="form-field form-field-wide">
                <span>补充材料链接（可选）</span>
                <input
                  type="url"
                  value={form.artifactUrl}
                  onChange={(e) => updateField("artifactUrl", e.target.value)}
                  placeholder="https://..."
                />
                <small>可以是代码仓库、截图链接等，帮助理解你的经历</small>
              </label>
            </div>

            {error && (
              <div className="form-error">
                <CircleAlert size={16} />
                {error}
              </div>
            )}

            <div className="form-footer">
              <p>只记录你经历过的一次具体事件，不需要代表所有人。</p>
              <button className="primary-button" type="submit" disabled={!isValid || submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="spin" size={16} /> 提交中…
                  </>
                ) : (
                  <>
                    <Send size={16} /> 提交我的经历
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
