import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { ClipboardCheck, Users, BarChart4, GitMerge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CreateOrEditAnnotationQueueButton } from "@/src/features/annotation-queues/components/CreateOrEditAnnotationQueueButton";

export function AnnotationQueuesOnboarding({
  projectId,
}: {
  projectId: string;
}) {
  const { t } = useTranslation();

  const valuePropositions: ValueProposition[] = [
    {
      title: t(
        "annotationQueue.onboarding.valuePropositions.manageScoringWorkflows.title",
      ),
      description: t(
        "annotationQueue.onboarding.valuePropositions.manageScoringWorkflows.description",
      ),
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      title: t(
        "annotationQueue.onboarding.valuePropositions.collaborateWithAnnotators.title",
      ),
      description: t(
        "annotationQueue.onboarding.valuePropositions.collaborateWithAnnotators.description",
      ),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t(
        "annotationQueue.onboarding.valuePropositions.trackAnnotationMetrics.title",
      ),
      description: t(
        "annotationQueue.onboarding.valuePropositions.trackAnnotationMetrics.description",
      ),
      icon: <BarChart4 className="h-4 w-4" />,
    },
    {
      title: t(
        "annotationQueue.onboarding.valuePropositions.baselineEvaluationEfforts.title",
      ),
      description: t(
        "annotationQueue.onboarding.valuePropositions.baselineEvaluationEfforts.description",
      ),
      icon: <GitMerge className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("annotationQueue.onboarding.getStartedTitle")}
      description={t("annotationQueue.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      primaryAction={{
        label: t("annotationQueue.onboarding.createAnnotationQueue"),
        component: (
          <CreateOrEditAnnotationQueueButton
            variant="default"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: "Learn More",
        href: "https://langfuse.com/docs/scores/annotation",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/annotation-queue-overview-v1.mp4"
    />
  );
}
