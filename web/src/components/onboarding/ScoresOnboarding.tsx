import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { ThumbsUp, Star, LineChart, Code } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ScoresOnboarding() {
  const { t } = useTranslation();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("evaluation.score.features.collectUserFeedback.title"),
      description: t(
        "evaluation.score.features.collectUserFeedback.description",
      ),
      icon: <ThumbsUp className="h-4 w-4" />,
    },
    {
      title: t("evaluation.score.features.runModelBasedEvaluations.title"),
      description: t(
        "evaluation.score.features.runModelBasedEvaluations.description",
      ),
      icon: <Star className="h-4 w-4" />,
    },
    {
      title: t("evaluation.score.features.trackQualityMetrics.title"),
      description: t(
        "evaluation.score.features.trackQualityMetrics.description",
      ),
      icon: <LineChart className="h-4 w-4" />,
    },
    {
      title: t("evaluation.score.features.useCustomMetrics.title"),
      description: t("evaluation.score.features.useCustomMetrics.description"),
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("evaluation.score.onboarding.getStartedTitle")}
      description={t("evaluation.score.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      secondaryAction={{
        label: t("evaluation.score.onboarding.learnMore"),
        href: "https://langfuse.com/docs/evaluation/evaluation-methods/custom-scores",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/scores-overview-v1.mp4"
    />
  );
}
