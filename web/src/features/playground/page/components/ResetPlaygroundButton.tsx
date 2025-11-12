import { ListRestartIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/ui/button";
import { usePersistedWindowIds } from "@/src/features/playground/page/hooks/usePersistedWindowIds";

export const ResetPlaygroundButton: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { clearAllCache } = usePersistedWindowIds();

  const handleClick = () => {
    clearAllCache();
    router.reload();
  };

  return (
    <Button
      variant="outline"
      title={t("common.labels.resetPlayground")}
      onClick={handleClick}
      className="gap-1"
    >
      <ListRestartIcon className="h-4 w-4" />
      <span className="hidden lg:inline">
        {t("common.labels.resetPlayground")}
      </span>
    </Button>
  );
};
