import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Users, LineChart, Filter, BarChart4 } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export function UsersOnboarding() {
  const { t } = useTranslation();
  const valuePropositions: ValueProposition[] = [
    {
      title: t("user.features.trackUserInteractions.title"),
      description: t("user.features.trackUserInteractions.description"),
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t("user.features.analyzeUserBehavior.title"),
      description: t("user.features.analyzeUserBehavior.description"),
      icon: <LineChart className="h-4 w-4" />,
    },
    {
      title: t("user.features.filterByUserSegments.title"),
      description: t("user.features.filterByUserSegments.description"),
      icon: <Filter className="h-4 w-4" />,
    },
    {
      title: t("user.features.monitorUsageMetrics.title"),
      description: t("user.features.monitorUsageMetrics.description"),
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title={t("user.onboarding.getStartedTitle")}
      description={t("user.onboarding.getStartedDescription")}
      valuePropositions={valuePropositions}
      gettingStarted={
        <span>
          To start tracking users, you need to add a `userId` to your traces.
          See{" "}
          <Link
            href="https://langfuse.com/docs/observability/features/users"
            className="underline"
          >
            documentation
          </Link>{" "}
          for more details.
        </span>
      }
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/users-overview-v1.mp4"
    />
  );
}
