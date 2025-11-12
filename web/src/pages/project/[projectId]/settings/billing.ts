import { useQueryProject } from "@/src/features/projects/hooks";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function ProjectBillingRedirect() {
  const { t } = useTranslation();
  const router = useRouter();

  const { organization } = useQueryProject();

  useEffect(() => {
    if (organization) {
      router.replace(`/organization/${organization.id}/settings/billing`);
    }
  }, [organization, router]);

  return t("common.status.redirecting");
}
