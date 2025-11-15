import DocPopup from "@/src/components/layouts/doc-popup";
import { Label } from "@/src/components/ui/label";
import { useTranslation } from "react-i18next";

export function VariableMappingDescription(p: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex w-1/2 items-center">
      <Label className="muted-foreground text-sm font-light">{p.title}</Label>
      <DocPopup description={p.description} href={p.href} />
    </div>
  );
}

export function TimeScopeDescription(props: {
  projectId: string;
  timeScope: ("NEW" | "EXISTING")[] | undefined;
  target: "trace" | "dataset_item" | undefined;
}) {
  const { t } = useTranslation();

  if (!props.timeScope || props.timeScope.length === 0) {
    return t("evaluation.eval.form.selectTimeScope");
  }

  // Determine scope text based on timeScope
  const scope =
    props.timeScope?.includes("NEW") && props.timeScope?.includes("EXISTING")
      ? t("evaluation.eval.pages.allFutureAndExisting")
      : props.timeScope?.includes("NEW")
        ? t("evaluation.eval.pages.allFuture")
        : t("evaluation.eval.pages.allExisting");

  // Determine target text based on target type
  const target =
    props.target === "trace"
      ? t("evaluation.eval.pages.traces")
      : t("evaluation.eval.pages.datasetRunItems");

  return (
    <div>
      {t("evaluation.eval.pages.thisConfigurationWillTarget", {
        scope,
        target,
      })}
    </div>
  );
}
