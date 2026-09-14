"use client";

import { CircleAlert, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  EvidenceMission,
  EvidenceRecord,
  EvidenceSubmission,
  ImpactReceipt,
  Investigation,
  KnowledgeStateStatus,
} from "@human-api/contracts";
import { getMockInvestigation } from "@/lib/mock-data";
import {
  getInvestigation,
  submitEvidence,
  createMission,
  organizeDiscussion,
} from "@/lib/api-client";
import { AppHeader, InvestigationView, MissionDrawer, getClientErrorMessage } from "@/app/page";

export default function InvestigationClient({ investigationId }: { investigationId: string }) {
  const router = useRouter();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMission, setActiveMission] = useState<EvidenceMission | null>(null);
  const [creatingMission, setCreatingMission] = useState(false);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [missionError, setMissionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{
    record: EvidenceRecord;
    receipt: ImpactReceipt;
    before: KnowledgeStateStatus;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    getInvestigation(investigationId)
      .then((result) => {
        if (!cancelled) setInvestigation(result);
      })
      .catch(() => {
        const result = getMockInvestigation(investigationId);
        if (!cancelled) {
          if (result) setInvestigation(structuredClone(result));
          else setPageError("没有找到对应的求证。");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [investigationId]);

  async function handleOrganizeDiscussion(discussionId: string) {
    if (!investigation) return;
    setMissionError(null);
    try {
      const discussion = investigation.discussions.find((item) => item.id === discussionId);
      if (!discussion) return;
      const organization = await organizeDiscussion(discussion);
      setInvestigation((current) =>
        current
          ? {
              ...current,
              discussionOrganizations: [
                ...current.discussionOrganizations.filter(
                  (item) => item.discussionId !== discussionId,
                ),
                organization,
              ],
            }
          : current,
      );
    } catch (error) {
      setMissionError(getClientErrorMessage(error));
    }
  }

  async function handleJoinMission() {
    if (!investigation) return;
    setCreatingMission(true);
    setPageError(null);
    try {
      const gapId = investigation.evidenceState.nextGap?.id;
      const updated = await createMission(investigation.id, gapId);
      const existing = updated.missions.find((item) => item.evidenceGapId === gapId);
      if (!existing) throw new Error("Mock Mission 创建失败。");
      setInvestigation(updated);
      const mission = existing;
      if (!mission) throw new Error("后端没有返回可参与的 Mission。");
      setActiveMission(mission);
    } catch (error) {
      setPageError(getClientErrorMessage(error));
    } finally {
      setCreatingMission(false);
    }
  }

  async function handleSubmitEvidence(submission: EvidenceSubmission) {
    if (!investigation || !activeMission) return;
    setSubmittingEvidence(true);
    setMissionError(null);
    const before = investigation.knowledgeState.status;
    const existingIds = new Set(investigation.evidence.map((item) => item.id));
    try {
      const result = await submitEvidence(activeMission.id, submission);
      const record =
        result.record ??
        [...result.investigation.evidence].reverse().find((item) => !existingIds.has(item.id));
      setInvestigation(result.investigation);
      setActiveMission(null);
      if (record) setOutcome({ record, receipt: result.receipt, before });
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
    } catch (error) {
      setMissionError(getClientErrorMessage(error));
    } finally {
      setSubmittingEvidence(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <AppHeader
          onReset={() => router.push("/")}
          hasInvestigation
          onSearch={() => router.push("/#search")}
          onMyInvestigations={() => router.push("/#mine")}
          activeNav="home"
        />
        <main className="workspace-page workspace-loading">
          <div className="loading-card" aria-live="polite">
            <LoaderCircle className="spin" size={22} />
            <span>正在恢复这次求证…</span>
          </div>
        </main>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="app-shell">
        <AppHeader
          onReset={() => router.push("/")}
          hasInvestigation
          onSearch={() => router.push("/#search")}
          onMyInvestigations={() => router.push("/#mine")}
          activeNav="home"
        />
        <main className="workspace-page workspace-loading">
          <div className="loading-card loading-card-error" role="alert">
            <CircleAlert size={22} />
            <div>
              <strong>这次求证暂时打不开</strong>
              <p>{pageError ?? "没有找到对应的 Investigation。"}</p>
              <button className="primary-button" type="button" onClick={() => router.refresh()}>
                重试加载
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        onReset={() => router.push("/")}
        hasInvestigation
        onSearch={() => router.push("/#search")}
        onMyInvestigations={() => router.push("/#mine")}
        activeNav="home"
      />
      <div className="knowledge-object-link-bar">
        <span>查看 Knowledge Object 服务端投影</span>
        <button
          className="quiet-button"
          type="button"
          onClick={() => router.push(`/knowledge-object/${encodeURIComponent(investigation.id)}`)}
        >
          打开 Knowledge Object
        </button>
      </div>
      `r`n{" "}
      <InvestigationView
        investigation={investigation}
        onJoin={handleJoinMission}
        onOrganizeDiscussion={handleOrganizeDiscussion}
        creatingMission={creatingMission}
        outcome={outcome}
        onDismissOutcome={() => setOutcome(null)}
      />
      {pageError ? (
        <div className="floating-error" role="alert">
          <CircleAlert size={17} />
          <span>{pageError}</span>
          <button type="button" onClick={() => setPageError(null)} aria-label="关闭错误">
            <X size={16} />
          </button>
        </div>
      ) : null}
      {activeMission ? (
        <MissionDrawer
          mission={activeMission}
          onClose={() => setActiveMission(null)}
          onSubmit={handleSubmitEvidence}
          submitting={submittingEvidence}
          error={missionError}
        />
      ) : null}
    </div>
  );
}
