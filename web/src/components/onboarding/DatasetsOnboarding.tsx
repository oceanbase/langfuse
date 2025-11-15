import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Database, Beaker, Zap, Code } from "lucide-react";
import { DatasetActionButton } from "@/src/features/datasets/components/DatasetActionButton";
import { useTranslation } from "react-i18next";

export function DatasetsOnboarding({ projectId }: { projectId: string }) {
  const { t } = useTranslation();

  const valuePropositions: ValueProposition[] = [
    {
      title: t(
        "dataset.onboarding.valuePropositions.continuousImprovement.title",
      ),
      description: t(
        "dataset.onboarding.valuePropositions.continuousImprovement.description",
      ),
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: t(
        "dataset.onboarding.valuePropositions.preDeploymentTesting.title",
      ),
      description: t(
        "dataset.onboarding.valuePropositions.preDeploymentTesting.description",
      ),
      icon: <Beaker className="h-4 w-4" />,
    },
    {
      title: t("dataset.onboarding.valuePropositions.structuredTesting.title"),
      description: t(
        "dataset.onboarding.valuePropositions.structuredTesting.description",
      ),
      icon: <Database className="h-4 w-4" />,
    },
    {
      title: t("dataset.onboarding.valuePropositions.customWorkflows.title"),
      description: t(
        "dataset.onboarding.valuePropositions.customWorkflows.description",
      ),
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("dataset.onboarding.getStartedTitle")}
      description={t("dataset.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("dataset.onboarding.createDataset"),
        component: (
          <DatasetActionButton
            variant="default"
            mode="create"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: t("dataset.onboarding.learnMore"),
        href: "https://langfuse.com/docs/datasets",
      }}
    />
  );
}
