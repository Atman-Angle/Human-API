import {
  ConversationDraftSchema,
  type ConversationDraft,
  type EvidenceMission,
  type EvidenceSubmission,
} from "@human-api/contracts";

/** Extract verbatim clauses only. Missing/withheld facts stay absent; no grading here. */
export function extractConfirmedObservation(
  summary: string,
  demoSample = false,
): EvidenceSubmission {
  const clauses = summary
    .split(/[。；;\n！？!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const available = clauses.filter(
    (s) => !/不记得|不方便|未使用|没用过|没有用过|没有亲身经历|不是我|听说|据说/.test(s),
  );
  const find = (pattern: RegExp) => available.find((s) => pattern.test(s));
  const participantType = find(/我.{0,8}(学生|实习生|初级开发者|[0123０１２３]年.*开发)/);
  const experience = find(/我.*(最近|上周|本周|昨天|项目|过去|个月|一周)|最近|上周|本周|昨天/);
  const task = find(/我.*(实现|编写|写了|写代码|做.*测试|调试|开发了|负责|修复|重构)/);
  const aiRole = find(
    /(?:AI|Copilot|Cursor|Claude|Codex).*(生成|写|补全|测试|重构|解释|修改|没有|没能|失败|帮助)/i,
  );
  const humanJudgment = find(
    /我.*(检查|审查|判断|确认|验收|修改|决定|修正|保留|拒绝|review|测试发现)/i,
  );
  return {
    statement: summary,
    demoSample,
    ...(participantType ? { participantType } : {}),
    ...(experience ? { experience } : {}),
    ...(task ? { task } : {}),
    ...(aiRole ? { aiRole } : {}),
    ...(humanJudgment ? { humanJudgment } : {}),
  };
}

export function prepareConversation(
  mission: EvidenceMission,
  answers: string[],
): ConversationDraft {
  const summary = answers.join("\n");
  const extracted = extractConfirmedObservation(summary);
  let question: string | undefined;
  if (!answers.length)
    question = `围绕这次邀请：${mission.description} 请说说你亲历的一次具体工作：发生了什么，AI 做了或没做到什么？支持、反例或没有变化都欢迎。`;
  else if (answers.length < 3 && !/不记得|不方便/.test(answers.at(-1) ?? "")) {
    const missing: string[] = [];
    // Prioritize the concrete event over profile collection; never request known fields.
    if (!extracted.task || !extracted.aiRole)
      missing.push("具体做的任务，以及 AI 实际做了或没做到什么");
    if (!extracted.humanJudgment)
      missing.push("你最后如何检查或决定是否采用结果（没有检查、没有采用也可以如实说）");
    if (!extracted.experience) missing.push("发生的时间或项目背景");
    if (!extracted.participantType) missing.push("你当时的身份（如学生、实习生或开发年限）");
    // A second follow-up asks only for still-missing context, and only when
    // the prior answer supplied new information.
    const previous = extractConfirmedObservation(answers.slice(0, -1).join("\n"));
    const gained = Object.keys(extracted).length > Object.keys(previous).length;
    if (missing.length && (answers.length === 1 || gained))
      question = `还想了解${missing.slice(0, 2).join("、")}。只补充你记得的部分；不记得或不方便说可以直接跳过。`;
  }
  return ConversationDraftSchema.parse({
    question,
    summary,
    followUpCount: Math.min(
      2,
      Math.max(0, answers.length - 1) + (question && answers.length ? 1 : 0),
    ),
    preparation: "EXTRACTIVE_RULES",
    limitations: [
      "演示采用保守的原话摘录规则，不冒充实时大模型。未识别的信息不会补造，可在确认前编辑。",
    ],
  });
}
