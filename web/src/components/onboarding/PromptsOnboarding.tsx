import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { FileText, GitBranch, Zap, BarChart4 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PromptsOnboarding({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("prompt.features.decoupledFromCode.title"),
      description: t("prompt.features.decoupledFromCode.description"),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: t("prompt.features.editInUIOrProgrammatically.title"),
      description: t("prompt.features.editInUIOrProgrammatically.description"),
      icon: <GitBranch className="h-4 w-4" />,
    },
    {
      title: t("prompt.features.performanceOptimized.title"),
      description: t("prompt.features.performanceOptimized.description"),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t("prompt.features.compareMetrics.title"),
      description: t("prompt.features.compareMetrics.description"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("prompt.onboarding.getStartedTitle")}
      description={t("prompt.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("prompt.onboarding.createPrompt"),
        href: `/project/${projectId}/prompts/new`,
      }}
      secondaryAction={{
        label: t("prompt.onboarding.learnMore"),
        href: "https://langfuse.com/docs/prompt-management/get-started",
      }}
    />
  );
}
