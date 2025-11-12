import {
  ChatMessage,
  decryptAndParseExtraHeaders,
  fetchLLMCompletion,
  logger,
  type TraceParams,
} from "@langfuse/shared/src/server";
import { ApiError, LLMApiKeySchema, ZodModelConfig } from "@langfuse/shared";
import { z } from "zod/v4";
import { z as zodV3 } from "zod/v3";
import { ZodSchema as ZodV3Schema } from "zod/v3";
import { decrypt } from "@langfuse/shared/encryption";
import { tokenCount } from "../tokenisation/usage";
import Handlebars from "handlebars";

/**
 * Standard error handling for LLM operations
 * Handles common LLM errors like quota limits and throttling with appropriate status codes
 *
 * @param operation - The async LLM operation to execute
 * @param operationName - Name for error context (e.g., "call LLM")
 * @returns The result of the operation or throws an ApiError
 */
async function withLLMErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string = "LLM operation",
): Promise<T> {
  try {
    return await operation();
  } catch (e) {
    // Handle specific LLM provider errors with appropriate status codes
    if (
      e instanceof Error &&
      (e.name === "InsufficientQuotaError" || e.name === "ThrottlingException")
    ) {
      throw new ApiError(e.name, 429);
    }

    // Handle all other errors with preserved status codes
    throw new ApiError(
      `Failed to ${operationName}: ${e}`,
      (e as any)?.response?.status ?? (e as any)?.status,
    );
  }
}

export async function callStructuredLLM<T extends ZodV3Schema>(
  jeId: string,
  llmApiKey: z.infer<typeof LLMApiKeySchema>,
  messages: ChatMessage[],
  modelParams: z.infer<typeof ZodModelConfig>,
  provider: string,
  model: string,
  structuredOutputSchema: T,
): Promise<zodV3.infer<T>> {
  logger.info(`🚀 开始结构化 LLM 调用 - 任务ID: ${jeId}`, {
    jobExecutionId: jeId,
    provider,
    model,
    baseURL: llmApiKey.baseURL,
    adapter: llmApiKey.adapter,
    messagesCount: messages.length,
    hasExtraHeaders: !!llmApiKey.extraHeaders,
  });

  const startTime = Date.now();
  let result;
  let success = false;
  let error = null;

  try {
    result = await withLLMErrorHandling(async () => {
      logger.info(`📡 发送请求到 LLM - 任务ID: ${jeId}, 模型: ${model}`, {
        jobExecutionId: jeId,
        model,
        provider,
        baseURL: llmApiKey.baseURL,
      });

      const { completion } = await fetchLLMCompletion({
        streaming: false,
        apiKey: decrypt(llmApiKey.secretKey), // decrypt the secret key
        extraHeaders: decryptAndParseExtraHeaders(llmApiKey.extraHeaders),
        baseURL: llmApiKey.baseURL || undefined,
        messages,
        modelParams: {
          provider,
          model,
          adapter: llmApiKey.adapter,
          ...modelParams,
        },
        structuredOutputSchema,
        config: llmApiKey.config,
        maxRetries: 1,
      });

      logger.info(`📥 收到 LLM 响应 - 任务ID: ${jeId}`, {
        jobExecutionId: jeId,
        model,
        responseType: typeof completion,
        hasCompletion: !!completion,
      });

      // 为千问模型添加详细的响应日志和字段映射处理
      if (
        model.toLowerCase().includes("qwen") &&
        (provider.toLowerCase().includes("qianwen") ||
          provider.toLowerCase().includes("qwen"))
      ) {
        logger.info(`🔍 千问模型原始响应详情 - 任务ID: ${jeId}`, {
          jobExecutionId: jeId,
          model,
          provider,
          completionType: typeof completion,
          completionKeys:
            completion && typeof completion === "object"
              ? Object.keys(completion)
              : "N/A",
          completionPreview: completion
            ? JSON.stringify(completion, null, 2).substring(0, 1000)
            : "N/A",
          schemaType: structuredOutputSchema
            ? structuredOutputSchema.constructor.name
            : "N/A",
        });

        // 为千问模型添加字段名称映射处理
        if (
          completion &&
          typeof completion === "object" &&
          completion !== null
        ) {
          const mappedCompletion = { ...(completion as Record<string, any>) };

          // 处理可能的字段名称不匹配
          if (mappedCompletion.reason && !mappedCompletion.reasoning) {
            mappedCompletion.reasoning = mappedCompletion.reason;
            delete mappedCompletion.reason;
            logger.info(
              `🔧 千问模型字段映射: reason -> reasoning - 任务ID: ${jeId}`,
              {
                jobExecutionId: jeId,
                model,
                provider,
              },
            );
          }

          if (mappedCompletion.rating && !mappedCompletion.score) {
            mappedCompletion.score = mappedCompletion.rating;
            delete mappedCompletion.rating;
            logger.info(
              `🔧 千问模型字段映射: rating -> score - 任务ID: ${jeId}`,
              {
                jobExecutionId: jeId,
                model,
                provider,
              },
            );
          }

          // 如果字段仍然缺失，尝试从其他可能的字段中获取
          if (!mappedCompletion.reasoning && mappedCompletion.explanation) {
            mappedCompletion.reasoning = mappedCompletion.explanation;
            delete mappedCompletion.explanation;
            logger.info(
              `🔧 千问模型字段映射: explanation -> reasoning - 任务ID: ${jeId}`,
              {
                jobExecutionId: jeId,
                model,
                provider,
              },
            );
          }

          if (!mappedCompletion.score && mappedCompletion.value) {
            mappedCompletion.score = mappedCompletion.value;
            delete mappedCompletion.value;
            logger.info(
              `🔧 千问模型字段映射: value -> score - 任务ID: ${jeId}`,
              {
                jobExecutionId: jeId,
                model,
                provider,
              },
            );
          }

          // 记录映射后的结果
          logger.info(`🔧 千问模型字段映射后结果 - 任务ID: ${jeId}`, {
            jobExecutionId: jeId,
            model,
            provider,
            mappedKeys: Object.keys(mappedCompletion),
            mappedPreview: JSON.stringify(mappedCompletion, null, 2).substring(
              0,
              1000,
            ),
          });

          return structuredOutputSchema.parse(mappedCompletion);
        }
      }

      return structuredOutputSchema.parse(completion);
    }, "call LLM");

    const endTime = Date.now();
    const duration = endTime - startTime;
    success = true;

    logger.info(
      `✅ 结构化 LLM 调用成功 - 任务ID: ${jeId}, 耗时: ${duration}ms`,
      {
        jobExecutionId: jeId,
        duration,
        model,
        provider,
        result: result,
      },
    );

    return result;
  } catch (err) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    success = false;
    error = err;

    logger.error(
      `❌ 结构化 LLM 调用失败 - 任务ID: ${jeId}, 耗时: ${duration}ms`,
      {
        jobExecutionId: jeId,
        duration,
        model,
        provider,
        error: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : undefined,
      },
    );

    throw err;
  }
}

export async function callLLM(
  llmApiKey: z.infer<typeof LLMApiKeySchema>,
  messages: ChatMessage[],
  modelParams: z.infer<typeof ZodModelConfig>,
  provider: string,
  model: string,
  traceParams?: Omit<TraceParams, "tokenCountDelegate">,
): Promise<string> {
  return withLLMErrorHandling(async () => {
    const { completion, processTracedEvents } = await fetchLLMCompletion({
      streaming: false,
      apiKey: decrypt(llmApiKey.secretKey),
      extraHeaders: decryptAndParseExtraHeaders(llmApiKey.extraHeaders),
      baseURL: llmApiKey.baseURL || undefined,
      messages,
      modelParams: {
        provider,
        model,
        adapter: llmApiKey.adapter,
        ...modelParams,
      },
      config: llmApiKey.config,
      traceParams: traceParams
        ? { ...traceParams, tokenCountDelegate: tokenCount }
        : undefined,
      maxRetries: 1,
      throwOnError: false,
    });

    if (traceParams) {
      await processTracedEvents();
    }

    return completion;
  }, "call LLM");
}

export function compileHandlebarString(
  handlebarString: string,
  context: Record<string, any>,
): string {
  try {
    const template = Handlebars.compile(handlebarString, { noEscape: true });
    return template(context);
  } catch (error) {
    logger.info("Handlebars compilation error:", error);
    return handlebarString; // Fallback to the original string if Handlebars fails
  }
}
