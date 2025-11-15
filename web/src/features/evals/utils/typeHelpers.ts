import { type EvalTemplate } from "@langfuse/shared";

export const partnerIdentifierToName = new Map([["ragas", "Ragas"]]);

const getPartnerName = (partner: string) => {
  return partnerIdentifierToName.get(partner) ?? "Unknown";
};

export const getMaintainer = (
  evalTemplate: Partial<EvalTemplate> & {
    partner?: string | null;
    projectId: string | null;
  },
) => {
  if (evalTemplate.projectId === null) {
    if (evalTemplate.partner) {
      return `${getPartnerName(evalTemplate.partner)} maintained`;
    }
    return "Langfuse maintained";
  }
  return "User maintained";
};

// 返回翻译key而不是硬编码字符串
export const getMaintainerTranslationKey = (
  evalTemplate: Partial<EvalTemplate> & {
    partner?: string | null;
    projectId: string | null;
  },
) => {
  if (evalTemplate.projectId === null) {
    if (evalTemplate.partner) {
      // 对于合作伙伴，返回原始字符串（因为这是动态的）
      return `${getPartnerName(evalTemplate.partner)} maintained`;
    }
    return "evaluation.eval.pages.langfuseMaintained";
  }
  return "evaluation.eval.pages.userMaintained";
};
