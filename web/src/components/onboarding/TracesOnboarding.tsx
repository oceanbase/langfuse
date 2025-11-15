import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { setupTracingRoute } from "@/src/features/setup/setupRoutes";
import { BarChart4, GitMerge, Search, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TracesOnboardingProps {
  projectId: string;
}

export function TracesOnboarding({ projectId }: TracesOnboardingProps) {
  const { t } = useTranslation();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("tracing.features.fullContextCapture.title"),
      description: t("tracing.features.fullContextCapture.description"),
      icon: <GitMerge className="h-4 w-4" />,
    },
    {
      title: t("tracing.features.costMonitoring.title"),
      description: t("tracing.features.costMonitoring.description"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
    {
      title: t("tracing.features.basisForEvaluation.title"),
      description: t("tracing.features.basisForEvaluation.description"),
      icon: <Search className="h-4 w-4" />,
    },
    {
      title: t("tracing.features.openAndMultimodal.title"),
      description: t("tracing.features.openAndMultimodal.description"),
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("tracing.onboarding.getStartedTitle")}
      description={t("tracing.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("tracing.onboarding.configureTracing"),
        href: setupTracingRoute(projectId),
      }}
      secondaryAction={{
        label: "View Documentation",
        href: "https://langfuse.com/docs/observability/overview",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/tracing-overview-v1.mp4"
    />
  );
}
