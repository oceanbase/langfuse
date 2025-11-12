import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Bot, Gauge, Zap, BarChart4 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EvaluatorsOnboardingProps {
  projectId: string;
}

export function EvaluatorsOnboarding({ projectId }: EvaluatorsOnboardingProps) {
  const { t } = useTranslation();

  const valuePropositions: ValueProposition[] = [
    {
      title: t(
        "evaluation.eval.pages.valuePropositions.automateEvaluations.title",
      ),
      description: t(
        "evaluation.eval.pages.valuePropositions.automateEvaluations.description",
      ),
      icon: <Bot className="h-4 w-4" />,
    },
    {
      title: t("evaluation.eval.pages.valuePropositions.measureQuality.title"),
      description: t(
        "evaluation.eval.pages.valuePropositions.measureQuality.description",
      ),
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      title: t(
        "evaluation.eval.pages.valuePropositions.scaleEfficiently.title",
      ),
      description: t(
        "evaluation.eval.pages.valuePropositions.scaleEfficiently.description",
      ),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t(
        "evaluation.eval.pages.valuePropositions.trackPerformance.title",
      ),
      description: t(
        "evaluation.eval.pages.valuePropositions.trackPerformance.description",
      ),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("evaluation.eval.pages.getStartedTitle")}
      description={t("evaluation.eval.pages.getStartedDescription")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("evaluation.eval.pages.createEvaluator"),
        href: `/project/${projectId}/evals/new`,
      }}
      secondaryAction={{
        label: "Learn More",
        href: "https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/scores-llm-as-a-judge-overview-v1.mp4"
    />
  );
}
