import { Badge } from "@/src/components/ui/badge";
import { useTranslation } from "react-i18next";

export const PromptVariableListPreview = ({
  variables,
}: {
  variables: string[];
}) => {
  const { t } = useTranslation();

  if (variables.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="mb-2 text-sm text-muted-foreground">
        {t("evaluation.eval.pages.theFollowingVariablesAreAvailable")}
      </p>
      <div className="flex min-h-6 flex-wrap gap-2">
        {variables.map((variable) => (
          <Badge key={variable} variant="outline">
            {variable}
          </Badge>
        ))}
      </div>
    </div>
  );
};
