import { Check, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/ui/button";
import {
  InputCommand,
  InputCommandEmpty,
  InputCommandGroup,
  InputCommandInput,
  InputCommandItem,
  InputCommandList,
} from "@/src/components/ui/input-command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { usePlaygroundContext } from "@/src/features/playground/page/context";
import usePlaygroundCache from "@/src/features/playground/page/hooks/usePlaygroundCache";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { api } from "@/src/utils/api";
import { cn } from "@/src/utils/tailwind";
import DocPopup from "@/src/components/layouts/doc-popup";
import { PromptType } from "@langfuse/shared";

interface SaveToPromptButtonProps {
  className?: string;
}

export const SaveToPromptButton: React.FC<SaveToPromptButtonProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const { modelParams, messages, output, promptVariables } =
    usePlaygroundContext();
  const capture = usePostHogClientCapture();
  const router = useRouter();
  const projectId = useProjectIdFromURL();
  const { setPlaygroundCache } = usePlaygroundCache();

  const allChatPromptNamesWithIds =
    api.prompts.allNames
      .useQuery(
        {
          projectId: projectId as string, // Typecast as query is enabled only when projectId is present
          type: PromptType.Chat,
        },
        { enabled: Boolean(projectId) },
      )
      .data?.map((prompt) => ({
        name: prompt.name,
        id: prompt.id,
      })) ?? [];

  const handleNewPrompt = async () => {
    capture("playground:save_to_new_prompt_button_click", { projectId });

    setPlaygroundCache({
      modelParams,
      messages,
      output,
      promptVariables,
    });

    await router.push(
      `/project/${projectId}/prompts/new?loadPlaygroundCache=true`,
    );
  };

  const handleNewPromptVersion = async () => {
    capture("playground:save_to_prompt_version_button_click", { projectId });

    setPlaygroundCache({
      modelParams,
      messages,
      output,
      promptVariables,
    });

    await router.push(
      `/project/${projectId}/prompts/new?promptId=${selectedPromptId}&loadPlaygroundCache=true`,
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-6 w-6 p-0 hover:bg-muted", className)}
          title="Save current configuration as a prompt template for reuse across your project"
        >
          <Save size={14} />
          <span className="sr-only">Save as prompt</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Button className="mt-2 w-full" onClick={handleNewPrompt}>
          {t("playground.prompts.saveAsNewPrompt")}
        </Button>
        <Divider />
        <InputCommand className="min-h-[8rem]">
          <InputCommandInput
            placeholder={t("playground.prompts.searchChatPrompts")}
          />
          <InputCommandEmpty>
            {t("playground.prompts.noChatPromptFound")}
            <DocPopup
              description={t("playground.prompts.playgroundPromptsDescription")}
            />
          </InputCommandEmpty>
          <InputCommandGroup className="mt-2">
            <InputCommandList>
              {allChatPromptNamesWithIds.map((chatPrompt) => (
                <InputCommandItem
                  key={chatPrompt.id}
                  title={chatPrompt.name}
                  value={chatPrompt.name}
                  onSelect={(currentValue) => {
                    const promptId =
                      allChatPromptNamesWithIds.find(
                        (prompt) => prompt.name === currentValue,
                      )?.id ?? "";

                    setSelectedPromptId(
                      promptId === selectedPromptId ? "" : promptId,
                    );
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedPromptId === chatPrompt.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {chatPrompt.name}
                  </span>
                </InputCommandItem>
              ))}
            </InputCommandList>
          </InputCommandGroup>
        </InputCommand>
        <Button
          className="mt-2 w-full"
          disabled={!Boolean(selectedPromptId)}
          onClick={handleNewPromptVersion}
        >
          {t("playground.prompts.saveAsNewPromptVersion")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export function Divider() {
  const { t } = useTranslation();
  return (
    <div className="my-3 flex flex-row justify-center align-middle">
      <div className="flex flex-1 flex-col">
        <div className="flex-1 border-b-2 border-gray-200" />
        <div className="flex-1" />
      </div>
      <p className="mx-2 text-sm text-gray-400">{t("playground.prompts.or")}</p>
      <div className="flex flex-1 flex-col">
        <div className="flex-1 border-b-2 border-gray-200" />
        <div className="flex-1" />
      </div>
    </div>
  );
}
