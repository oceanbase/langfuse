import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { BarChart4, GitMerge, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export function SessionsOnboarding() {
  const { t } = useTranslation();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("session.features.groupRelatedTraces.title"),
      description: t("session.features.groupRelatedTraces.description"),
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      title: t("session.features.trackUserInteractions.title"),
      description: t("session.features.trackUserInteractions.description"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t("session.features.analyzeConversationFlows.title"),
      description: t("session.features.analyzeConversationFlows.description"),
      icon: <GitMerge className="h-4 w-4" />,
    },
    {
      title: t("session.features.sessionLevelMetrics.title"),
      description: t("session.features.sessionLevelMetrics.description"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("session.onboarding.getStartedTitle")}
      description={t("session.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      gettingStarted={
        <span>
          To start using sessions, you need to add a `sessionId` to your traces.
          See{" "}
          <Link
            href="https://langfuse.com/docs/observability/features/sessions"
            className="underline"
          >
            documentation
          </Link>{" "}
          for more details.
        </span>
      }
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/sessions-overview-v1.mp4"
    />
  );
}
