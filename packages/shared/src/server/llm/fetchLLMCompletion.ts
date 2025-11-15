// We need to use Zod3 for structured outputs due to a bug in
// ChatVertexAI. See issue: https://github.com/langfuse/langfuse/issues/7429
import { type ZodSchema } from "zod/v3";

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatBedrockConverse } from "@langchain/aws";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { ChatOpenAI, AzureChatOpenAI } from "@langchain/openai";
import { env } from "../../env";
import GCPServiceAccountKeySchema, {
  BedrockConfigSchema,
  BedrockCredentialSchema,
  VertexAIConfigSchema,
  BEDROCK_USE_DEFAULT_CREDENTIALS,
} from "../../interfaces/customLLMProviderConfigSchemas";
import { processEventBatch } from "../ingestion/processEventBatch";
import { logger } from "../logger";
import {
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  LLMAdapter,
  LLMJSONSchema,
  LLMToolDefinition,
  ModelParams,
  ToolCallResponse,
  ToolCallResponseSchema,
  TraceParams,
} from "./types";
import { CallbackHandler } from "langfuse-langchain";
import type { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { HttpsProxyAgent } from "https-proxy-agent";
import { clickhouseClient } from "../clickhouse/client";
import { eventTypes } from "../ingestion/types";

const isLangfuseCloud = Boolean(env.NEXT_PUBLIC_LANGFUSE_CLOUD_REGION);

type ProcessTracedEvents = () => Promise<void>;

type LLMCompletionParams = {
  messages: ChatMessage[];
  modelParams: ModelParams;
  structuredOutputSchema?: ZodSchema | LLMJSONSchema;
  callbacks?: BaseCallbackHandler[];
  baseURL?: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
  maxRetries?: number;
  config?: Record<string, string> | null;
  traceParams?: TraceParams;
  throwOnError?: boolean; // default is true
};

type FetchLLMCompletionParams = LLMCompletionParams & {
  streaming: boolean;
  tools?: LLMToolDefinition[];
};

export async function fetchLLMCompletion(
  // eslint-disable-next-line no-unused-vars
  params: LLMCompletionParams & {
    streaming: true;
  },
): Promise<{
  completion: IterableReadableStream<Uint8Array>;
  processTracedEvents: ProcessTracedEvents;
}>;

export async function fetchLLMCompletion(
  // eslint-disable-next-line no-unused-vars
  params: LLMCompletionParams & {
    streaming: false;
  },
): Promise<{
  completion: string;
  processTracedEvents: ProcessTracedEvents;
}>;

export async function fetchLLMCompletion(
  // eslint-disable-next-line no-unused-vars
  params: LLMCompletionParams & {
    streaming: false;
    structuredOutputSchema: ZodSchema;
  },
): Promise<{
  completion: Record<string, unknown>;
  processTracedEvents: ProcessTracedEvents;
}>;

export async function fetchLLMCompletion(
  // eslint-disable-next-line no-unused-vars
  params: LLMCompletionParams & {
    tools: LLMToolDefinition[];
    streaming: false;
  },
): Promise<{
  completion: ToolCallResponse;
  processTracedEvents: ProcessTracedEvents;
}>;

export async function fetchLLMCompletion(
  params: FetchLLMCompletionParams,
): Promise<{
  completion:
    | string
    | IterableReadableStream<Uint8Array>
    | Record<string, unknown>
    | ToolCallResponse;
  processTracedEvents: ProcessTracedEvents;
}> {
  // the apiKey must never be printed to the console
  const {
    messages,
    tools,
    modelParams,
    streaming,
    callbacks,
    apiKey,
    baseURL,
    maxRetries,
    config,
    traceParams,
    extraHeaders,
    throwOnError = true,
  } = params;

  let finalCallbacks: BaseCallbackHandler[] | undefined = callbacks ?? [];
  let processTracedEvents: ProcessTracedEvents = () => Promise.resolve();

  if (traceParams) {
    const handler = new CallbackHandler({
      _projectId: traceParams.projectId,
      _isLocalEventExportEnabled: true,
      environment: traceParams.environment,
    });
    finalCallbacks.push(handler);

    processTracedEvents = async () => {
      try {
        const events = await handler.langfuse._exportLocalEvents(
          traceParams.projectId,
        );
        await processEventBatch(
          JSON.parse(JSON.stringify(events)), // stringify to emulate network event batch from network call
          traceParams.authCheck,
          { isLangfuseInternal: true },
        );
      } catch (e) {
        logger.error("Failed to process traced events", { error: e });
      }
    };
  }

  finalCallbacks = finalCallbacks.length > 0 ? finalCallbacks : undefined;

  // Helper function to safely stringify content
  const safeStringify = (content: any): string => {
    try {
      return JSON.stringify(content);
    } catch {
      return "[Unserializable content]";
    }
  };

  let finalMessages: BaseMessage[];
  // VertexAI requires at least 1 user message
  if (modelParams.adapter === LLMAdapter.VertexAI && messages.length === 1) {
    const safeContent =
      typeof messages[0].content === "string"
        ? messages[0].content
        : JSON.stringify(messages[0].content);
    finalMessages = [new HumanMessage(safeContent)];
  } else {
    finalMessages = messages.map((message) => {
      // For arbitrary content types, convert to string safely
      const safeContent =
        typeof message.content === "string"
          ? message.content
          : safeStringify(message.content);

      if (message.role === ChatMessageRole.User)
        return new HumanMessage(safeContent);
      if (
        message.role === ChatMessageRole.System ||
        message.role === ChatMessageRole.Developer
      )
        return new SystemMessage(safeContent);

      if (message.type === ChatMessageType.ToolResult) {
        return new ToolMessage({
          content: safeContent,
          tool_call_id: message.toolCallId,
        });
      }

      return new AIMessage({
        content: safeContent,
        tool_calls:
          message.type === ChatMessageType.AssistantToolCall
            ? (message.toolCalls as any)
            : undefined,
      });
    });
  }

  finalMessages = finalMessages.filter(
    (m) => m.content.length > 0 || "tool_calls" in m,
  );

  // Common proxy configuration for all adapters
  const proxyUrl = env.HTTPS_PROXY;
  const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  let chatModel:
    | ChatOpenAI
    | ChatAnthropic
    | ChatBedrockConverse
    | ChatVertexAI
    | ChatGoogleGenerativeAI;
  if (modelParams.adapter === LLMAdapter.Anthropic) {
    chatModel = new ChatAnthropic({
      anthropicApiKey: apiKey,
      anthropicApiUrl: baseURL,
      modelName: modelParams.model,
      temperature: modelParams.temperature,
      maxTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      callbacks: finalCallbacks,
      clientOptions: {
        maxRetries,
        timeout: 1000 * 60 * 2, // 2 minutes timeout
        ...(proxyAgent && { httpAgent: proxyAgent }),
      },
      invocationKwargs: modelParams.providerOptions,
    });
  } else if (modelParams.adapter === LLMAdapter.OpenAI) {
    chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelParams.model,
      temperature: modelParams.temperature,
      maxTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      streamUsage: false, // https://github.com/langchain-ai/langchainjs/issues/6533
      callbacks: finalCallbacks,
      maxRetries,
      configuration: {
        baseURL,
        defaultHeaders: extraHeaders,
        ...(proxyAgent && { httpAgent: proxyAgent }),
      },
      modelKwargs: modelParams.providerOptions,
      timeout: 1000 * 60 * 2, // 2 minutes timeout
    });
  } else if (modelParams.adapter === LLMAdapter.Azure) {
    chatModel = new AzureChatOpenAI({
      azureOpenAIApiKey: apiKey,
      azureOpenAIBasePath: baseURL,
      azureOpenAIApiDeploymentName: modelParams.model,
      azureOpenAIApiVersion: "2025-02-01-preview",
      temperature: modelParams.temperature,
      maxTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      callbacks: finalCallbacks,
      maxRetries,
      timeout: 1000 * 60 * 2, // 2 minutes timeout
      configuration: {
        defaultHeaders: extraHeaders,
        ...(proxyAgent && { httpAgent: proxyAgent }),
      },
      modelKwargs: modelParams.providerOptions,
    });
  } else if (modelParams.adapter === LLMAdapter.Bedrock) {
    const { region } = BedrockConfigSchema.parse(config);
    // Handle both explicit credentials and default provider chain
    const credentials =
      apiKey === BEDROCK_USE_DEFAULT_CREDENTIALS && !isLangfuseCloud
        ? undefined // undefined = use AWS SDK default credential provider chain
        : BedrockCredentialSchema.parse(JSON.parse(apiKey));

    chatModel = new ChatBedrockConverse({
      model: modelParams.model,
      region,
      credentials,
      temperature: modelParams.temperature,
      maxTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      callbacks: finalCallbacks,
      maxRetries,
      timeout: 1000 * 60 * 2, // 2 minutes timeout
      additionalModelRequestFields: modelParams.providerOptions as any,
    });
  } else if (modelParams.adapter === LLMAdapter.VertexAI) {
    const credentials = GCPServiceAccountKeySchema.parse(JSON.parse(apiKey));
    const { location } = config
      ? VertexAIConfigSchema.parse(config)
      : { location: undefined };

    // Requests time out after 60 seconds for both public and private endpoints by default
    // Reference: https://cloud.google.com/vertex-ai/docs/predictions/get-online-predictions#send-request
    chatModel = new ChatVertexAI({
      modelName: modelParams.model,
      temperature: modelParams.temperature,
      maxOutputTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      callbacks: finalCallbacks,
      maxRetries,
      location,
      authOptions: {
        projectId: credentials.project_id,
        credentials,
      },
    });
  } else if (modelParams.adapter === LLMAdapter.GoogleAIStudio) {
    chatModel = new ChatGoogleGenerativeAI({
      model: modelParams.model,
      temperature: modelParams.temperature,
      maxOutputTokens: modelParams.max_tokens,
      topP: modelParams.top_p,
      callbacks: finalCallbacks,
      maxRetries,
      apiKey,
    });
  } else if (modelParams.adapter === LLMAdapter.PowerRAG) {
    // PowerRAG uses custom API format, handle separately
    const powerRAGCompletion = await handlePowerRAGCompletion({
      messages: finalMessages,
      apiKey,
      baseURL,
      extraHeaders,
      streaming,
      callbacks: finalCallbacks,
      modelParams,
      proxyAgent,
      traceParams,
    });

    return {
      completion: powerRAGCompletion,
      processTracedEvents,
    };
  } else {
    // eslint-disable-next-line no-unused-vars
    const _exhaustiveCheck: never = modelParams.adapter;
    throw new Error(
      `This model provider is not supported: ${_exhaustiveCheck}`,
    );
  }

  const runConfig = {
    callbacks: finalCallbacks,
    runId: traceParams?.traceId,
    runName: traceParams?.traceName,
  };

  try {
    logger.info(
      `🎯 开始 LLM 调用 - 模型: ${modelParams.model}, Provider: ${modelParams.provider}`,
      {
        model: modelParams.model,
        provider: modelParams.provider,
        adapter: modelParams.adapter,
        baseURL,
        hasStructuredOutput: !!params.structuredOutputSchema,
        hasTools: !!(tools && tools.length > 0),
        streaming,
        messagesCount: finalMessages.length,
      },
    );

    if (params.structuredOutputSchema) {
      logger.info(`🔧 使用结构化输出模式 - 模型: ${modelParams.model}`, {
        model: modelParams.model,
        schemaType: params.structuredOutputSchema.constructor.name,
      });

      // 千问模型特殊处理：当使用 response_format: { "type": "json_object" } 时，
      // 千问模型要求消息内容中必须包含 "json" 这个词
      let processedMessages = finalMessages;
      if (
        modelParams.model.toLowerCase().includes("qwen") &&
        (modelParams.provider.toLowerCase().includes("qianwen") ||
          modelParams.provider.toLowerCase().includes("qwen"))
      ) {
        logger.info(
          `🔧 检测到千问模型，添加 JSON 关键词 - 模型: ${modelParams.model}`,
          {
            model: modelParams.model,
            provider: modelParams.provider,
          },
        );

        processedMessages = finalMessages.map((message) => {
          if (
            message._getType() === "human" &&
            typeof message.content === "string"
          ) {
            // 检查消息内容是否已经包含 "json" 关键词
            const content = message.content.toLowerCase();
            if (!content.includes("json")) {
              // 在消息开头添加 JSON 关键词，并明确指定字段名称
              const enhancedContent = `Please respond with a JSON object containing exactly two fields: "reasoning" (string) and "score" (number). ${message.content}`;
              logger.info(
                `🔧 为千问模型添加 JSON 关键词 - 原始内容长度: ${message.content.length}, 增强后长度: ${enhancedContent.length}`,
                {
                  model: modelParams.model,
                  originalContentPreview:
                    message.content.substring(0, 100) +
                    (message.content.length > 100 ? "..." : ""),
                  enhancedContentPreview:
                    enhancedContent.substring(0, 100) +
                    (enhancedContent.length > 100 ? "..." : ""),
                },
              );
              return new HumanMessage(enhancedContent);
            }
          }
          return message;
        });
      }

      const result = await (chatModel as ChatOpenAI) // Typecast necessary due to https://github.com/langchain-ai/langchainjs/issues/6795
        .withStructuredOutput(params.structuredOutputSchema)
        .invoke(processedMessages, runConfig);

      logger.info(`✅ 结构化输出调用成功 - 模型: ${modelParams.model}`, {
        model: modelParams.model,
        resultType: typeof result,
        hasResult: !!result,
      });

      return {
        completion: result,
        processTracedEvents,
      };
    }

    if (tools && tools.length > 0) {
      logger.info(
        `🔧 使用工具调用模式 - 模型: ${modelParams.model}, 工具数量: ${tools.length}`,
        {
          model: modelParams.model,
          toolsCount: tools.length,
        },
      );

      const langchainTools = tools.map((tool) => ({
        type: "function",
        function: tool,
      }));

      const result = await chatModel
        .bindTools(langchainTools)
        .invoke(finalMessages, runConfig);

      const parsed = ToolCallResponseSchema.safeParse(result);
      if (!parsed.success) throw Error("Failed to parse LLM tool call result");

      logger.info(`✅ 工具调用成功 - 模型: ${modelParams.model}`, {
        model: modelParams.model,
        resultType: typeof result,
      });

      return {
        completion: parsed.data,
        processTracedEvents,
      };
    }

    if (streaming) {
      logger.info(`🔧 使用流式输出模式 - 模型: ${modelParams.model}`, {
        model: modelParams.model,
      });

      const result = await chatModel
        .pipe(new BytesOutputParser())
        .stream(finalMessages, runConfig);

      logger.info(`✅ 流式输出调用成功 - 模型: ${modelParams.model}`, {
        model: modelParams.model,
        resultType: typeof result,
      });

      return {
        completion: result,
        processTracedEvents,
      };
    }

    logger.info(`🔧 使用标准输出模式 - 模型: ${modelParams.model}`, {
      model: modelParams.model,
    });

    const result = await chatModel
      .pipe(new StringOutputParser())
      .invoke(finalMessages, runConfig);

    logger.info(`✅ 标准输出调用成功 - 模型: ${modelParams.model}`, {
      model: modelParams.model,
      resultType: typeof result,
      resultLength: typeof result === "string" ? result.length : "N/A",
    });

    return {
      completion: result,
      processTracedEvents,
    };
  } catch (error) {
    logger.error(
      `❌ LLM 调用失败 - 模型: ${modelParams.model}, 错误: ${error}`,
      {
        model: modelParams.model,
        provider: modelParams.provider,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    );

    if (throwOnError) {
      throw error;
    }

    return { completion: "", processTracedEvents };
  }
}

// PowerRAG specific handler
async function handlePowerRAGCompletion({
  messages,
  apiKey,
  baseURL,
  extraHeaders,
  streaming,
  callbacks,
  modelParams,
  proxyAgent,
  traceParams, // 添加traceParams参数
}: {
  messages: BaseMessage[];
  apiKey: string;
  baseURL?: string;
  extraHeaders?: Record<string, string>;
  streaming: boolean;
  callbacks?: BaseCallbackHandler[];
  modelParams: ModelParams;
  proxyAgent?: any;
  traceParams?: TraceParams; // 添加traceParams类型
}): Promise<string> {
  // 检查是否有Langfuse CallbackHandler
  const langfuseHandler = callbacks?.find(
    (callback) => callback.constructor.name === "CallbackHandler",
  );

  // 获取traceId，优先使用traceParams中的traceId
  const traceId = traceParams?.traceId;

  if (!traceId) {
    logger.warn("PowerRAG: 未提供traceId，将无法创建手动埋点", {
      hasTraceParams: !!traceParams,
      hasCallbacks: !!callbacks,
    });
  }

  // Convert LangChain messages to PowerRAG format
  // First try to find human messages
  let query = messages
    .filter((msg) => msg._getType() === "human")
    .map((msg) =>
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content),
    )
    .join("\n");

  // If no human messages found, try to use system messages or any other message type
  if (!query) {
    query = messages
      .filter((msg) => msg._getType() === "system" || msg._getType() === "ai")
      .map((msg) =>
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
      )
      .join("\n");
  }

  // If still no query, use the first available message
  if (!query && messages.length > 0) {
    const firstMessage = messages[0];
    query =
      typeof firstMessage.content === "string"
        ? firstMessage.content
        : JSON.stringify(firstMessage.content);
  }

  if (!query) {
    throw new Error("No user message found for PowerRAG query");
  }

  // Prepare PowerRAG request payload
  const powerRAGPayload = {
    inputs: {},
    query: query,
    response_mode: streaming ? "blocking" : "streaming", // Use appropriate response mode
    conversation_id: "",
    user: "abc-123", // Use consistent user ID
    files: [], // Can be extended to support file uploads
  };

  // Prepare headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  // Add Authorization header if API key is provided
  if (apiKey && apiKey.trim() !== "") {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    logger.warn("PowerRAG API key is empty or not provided", {
      hasApiKey: false,
      apiKeyValue: apiKey,
    });
  }

  const requestUrl =
    baseURL ||
    `${env.LANGFUSE_POWERRAG_PROTOCOL}://${env.LANGFUSE_POWERRAG_HOST}:${env.LANGFUSE_POWERRAG_PORT}/v1/chat-messages`;

  // 打印请求体
  console.log("🔍 PowerRAG 请求体:");
  console.log(JSON.stringify(powerRAGPayload, null, 2));

  // 详细的请求日志
  logger.info("PowerRAG API request", {
    url: requestUrl,
    hasApiKey: !!apiKey,
    streaming,
    traceId,
    projectId: traceParams?.projectId,
    environment: traceParams?.environment,
    traceName: traceParams?.traceName,
    queryLength: query.length,
    queryPreview: query.substring(0, 200) + (query.length > 200 ? "..." : ""),
    headers: Object.keys(headers),
    payloadSize: JSON.stringify(powerRAGPayload).length,
  });

  // 如果有traceParams，强制使用手动埋点，跳过callbacks
  if (traceParams && traceId) {
    logger.info(
      "PowerRAG: 检测到traceParams，强制使用手动埋点，跳过callbacks",
      {
        traceId,
        projectId: traceParams.projectId,
        environment: traceParams.environment,
        reason: "确保traceId一致性和手动埋点控制",
      },
    );
  } else if (langfuseHandler) {
    logger.info("PowerRAG: 未检测到traceParams，使用callbacks逻辑", {
      traceId,
      hasTraceParams: !!traceParams,
      hasTraceId: !!traceId,
    });
    try {
      // 尝试触发callbacks的LLM开始事件
      // LangChain API需要: handleLLMStart(llm: Serialized, prompts: string[], runId: string, ...)
      await langfuseHandler.handleLLMStart?.(
        {
          name: modelParams.model,
          id: [traceId || "powerrag-unknown"], // 使用traceId或生成一个默认ID
          lc: 1, // 添加必需的lc属性
          type: "not_implemented", // 添加必需的type属性
        },
        [query],
        traceId || "powerrag-unknown",
      );
    } catch (error) {
      logger.warn("PowerRAG: 触发callbacks失败，将使用手动trace创建", {
        error: error instanceof Error ? error.message : String(error),
        traceId,
      });
    }
  }

  const startTime = Date.now();
  let response: Response;
  let text: string;

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(powerRAGPayload),
      ...(proxyAgent && { agent: proxyAgent }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("PowerRAG API error response", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: requestUrl,
        traceId,
      });
      throw new Error(
        `PowerRAG API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    // Handle response based on streaming mode
    text = await response.text();

    // 打印返回结果
    console.log("📥 PowerRAG 返回结果:");
    console.log("状态码:", response.status);
    console.log("响应长度:", text.length);
    console.log("响应内容:", text);

    // 详细的响应日志
    logger.info("PowerRAG API response", {
      status: response.status,
      responseLength: text.length,
      streaming,
      traceId,
      projectId: traceParams?.projectId,
      environment: traceParams?.environment,
      responsePreview:
        text.substring(0, 200) + (text.length > 200 ? "..." : ""),
      startTime: new Date(startTime).toISOString(),
    });

    let completion: string;

    if (streaming) {
      // Handle streaming response
      try {
        // Try to parse as JSON first (PowerRAG format)
        const parsed = JSON.parse(text);

        if (parsed.answer) {
          completion = parsed.answer;
        } else if (parsed.content) {
          completion = parsed.content;
        } else {
          completion = JSON.stringify(parsed);
        }
      } catch (e) {
        // Fallback to Server-Sent Events format for streaming
        logger.info("PowerRAG parsing as Server-Sent Events", {
          parseError: e instanceof Error ? e.message : String(e),
          traceId,
        });

        const lines = text.split("\n");
        let content = "";
        let hasMessageEvents = false;
        let messageEndAnswer = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim() === "") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.event === "message") {
                hasMessageEvents = true;
                if (parsed.answer) {
                  // Handle PowerRAG streaming format where answer contains the content
                  // Filter out special markers and empty content
                  const answer = parsed.answer;
                  if (
                    answer &&
                    answer.trim() !== "" &&
                    !answer.includes("<Thinking Begin>") &&
                    !answer.includes("<Thinking End>") &&
                    !answer.includes("<Action Begin>") &&
                    !answer.includes("<Final Answer Begin>")
                  ) {
                    content += answer;
                  }
                }
              } else if (parsed.event === "message_end") {
                // Store message_end answer in case we need it
                if (parsed.answer) {
                  messageEndAnswer = parsed.answer;
                }
                break;
              } else if (parsed.content) {
                content += parsed.content;
              }
            } catch (e) {
              // Ignore parsing errors
              logger.debug("PowerRAG SSE line parse failed", {
                line: line.substring(0, 100),
                error: e instanceof Error ? e.message : String(e),
                traceId,
              });
            }
          }
        }

        // Return logic based on business rules:
        // 1. If we have message events, return the accumulated content from message events
        // 2. If no message events, return the answer from message_end event
        if (hasMessageEvents) {
          completion = content;
        } else {
          completion = messageEndAnswer;
        }
      }
    } else {
      // Handle blocking response
      try {
        const parsed = JSON.parse(text);

        if (parsed.answer) {
          completion = parsed.answer;
        } else if (parsed.content) {
          completion = parsed.content;
        } else {
          completion = JSON.stringify(parsed);
        }
      } catch (e) {
        // If not JSON, return the raw text
        completion = text;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 如果有traceParams，跳过callbacks，强制使用手动埋点
    if (traceParams && traceId) {
      logger.info("PowerRAG: 跳过callbacks，强制使用手动埋点", {
        traceId,
        projectId: traceParams.projectId,
        reason: "确保traceId一致性和手动埋点控制",
      });
    } else if (langfuseHandler) {
      // 如果没有traceParams，尝试使用callbacks
      try {
        await langfuseHandler.handleLLMEnd?.(
          {
            generations: [[{ text: completion }]],
            llmOutput: {},
          },
          traceId || "powerrag-unknown", // runId作为第二个参数
        );
        logger.info("PowerRAG: 成功触发callbacks，trace将通过callbacks创建", {
          traceId,
        });
        return completion;
      } catch (error) {
        logger.warn(
          "PowerRAG: 触发callbacks结束事件失败，将使用手动trace创建",
          {
            error: error instanceof Error ? error.message : String(error),
            traceId,
          },
        );
      }
    }

    // 如果没有Langfuse CallbackHandler或callbacks失败，手动创建trace
    logger.info("PowerRAG: 使用手动trace创建逻辑", {
      traceId,
      hasTraceParams: !!traceParams,
    });

    // 如果有traceParams，手动创建trace记录
    if (traceParams && traceId) {
      logger.info("PowerRAG: 开始手动创建trace", {
        traceId,
        projectId: traceParams.projectId,
        environment: traceParams.environment,
        traceName: traceParams.traceName || "PowerRAG Query",
        inputLength: query.length,
        outputLength: completion.length,
        duration,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });

      try {
        // 确保environment值符合公共模式验证规则
        let safeEnvironment = traceParams.environment;
        // 检查环境名是否符合验证规则
        if (
          safeEnvironment &&
          (safeEnvironment.startsWith("langfuse") ||
            safeEnvironment.length > 40)
        ) {
          // 如果环境名以langfuse开头或超过40字符，使用安全的默认值
          safeEnvironment = "prompt-experiment";
          logger.warn("PowerRAG: 环境名不符合验证规则，使用默认值", {
            originalEnvironment: traceParams.environment,
            safeEnvironment,
            reason: "环境名不能以langfuse开头且长度不能超过40字符",
          });
        }

        await createManualTrace({
          traceId,
          projectId: traceParams.projectId,
          environment: safeEnvironment,
          name: traceParams.traceName || "PowerRAG Query",
          input: query,
          output: completion,
          metadata: {
            provider: "PowerRAG",
            model: modelParams.model,
            adapter: modelParams.adapter,
            duration,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            streaming,
            manualTracing: true, // 标记为手动埋点
          },
        });
        logger.info("PowerRAG: 手动trace创建成功", {
          traceId,
          projectId: traceParams.projectId,
          environment: traceParams.environment,
          traceName: traceParams.traceName || "PowerRAG Query",
          completion: "trace已成功创建并加入处理队列",
        });
      } catch (error) {
        logger.error("PowerRAG: 手动trace创建失败", {
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          traceId,
          projectId: traceParams.projectId,
          environment: traceParams.environment,
          traceName: traceParams.traceName || "PowerRAG Query",
          completion: "trace创建失败，需要检查错误原因",
        });
      }
    } else {
      logger.warn("PowerRAG: 无法创建手动trace", {
        hasTraceParams: !!traceParams,
        hasTraceId: !!traceId,
        traceParams: traceParams
          ? {
              projectId: traceParams.projectId,
              environment: traceParams.environment,
              traceName: traceParams.traceName,
            }
          : null,
        completion: "缺少必要的trace参数",
      });
    }

    // 最终完成日志
    logger.info("PowerRAG: 调用完成", {
      traceId,
      projectId: traceParams?.projectId,
      environment: traceParams?.environment,
      completion: "PowerRAG调用已完全处理完成，包括trace创建",
      finalCompletionLength: completion.length,
      hasManualTrace: !!(traceParams && traceId),
      hasCallbacks: !!langfuseHandler,
    });

    return completion;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 如果有traceParams，跳过callbacks错误处理，强制使用手动埋点
    if (traceParams && traceId) {
      logger.info("PowerRAG: 跳过callbacks错误处理，强制使用手动埋点", {
        traceId,
        projectId: traceParams.projectId,
        reason: "确保traceId一致性和手动埋点控制",
      });
    } else if (langfuseHandler) {
      // 如果没有traceParams，尝试使用callbacks错误处理
      try {
        await langfuseHandler.handleLLMError?.(
          error,
          traceId || "powerrag-unknown",
        );
      } catch (callbackError) {
        logger.warn("PowerRAG: 触发callbacks错误事件失败", {
          error:
            callbackError instanceof Error
              ? callbackError.message
              : String(callbackError),
          traceId,
        });
      }
    }

    // 如果有traceParams，手动创建错误trace记录
    if (traceParams && traceId) {
      try {
        // 确保environment值符合公共模式验证规则
        let safeEnvironment = traceParams.environment;
        if (
          safeEnvironment &&
          (safeEnvironment.startsWith("langfuse") ||
            safeEnvironment.length > 40)
        ) {
          safeEnvironment = "prompt-experiment";
          logger.warn("PowerRAG: 错误处理中环境名不符合验证规则，使用默认值", {
            originalEnvironment: traceParams.environment,
            safeEnvironment,
          });
        }

        await createManualTrace({
          traceId,
          projectId: traceParams.projectId,
          environment: safeEnvironment,
          name: traceParams.traceName || "PowerRAG Query (Error)",
          input: query,
          output: null,
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            provider: "PowerRAG",
            model: modelParams.model,
            adapter: modelParams.adapter,
            duration,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            streaming,
            manualTracing: true, // 标记为手动埋点
            error: true,
          },
        });
        logger.info("PowerRAG: 错误trace手动创建成功", {
          traceId,
          projectId: traceParams.projectId,
        });
      } catch (traceError) {
        logger.error("PowerRAG: 错误trace手动创建失败", {
          error:
            traceError instanceof Error
              ? traceError.message
              : String(traceError),
          errorStack:
            traceError instanceof Error ? traceError.stack : undefined,
          errorName: traceError instanceof Error ? traceError.name : undefined,
          errorConstructor: traceError?.constructor?.name,
          traceId,
          projectId: traceParams.projectId,
          context: {
            originalError:
              error instanceof Error ? error.message : String(error),
            hasTraceParams: !!traceParams,
            hasTraceId: !!traceId,
            duration,
            streaming,
          },
          completion:
            "PowerRAG错误trace手动创建失败，记录详细的错误信息和上下文",
        });
      }
    }

    logger.error("PowerRAG API call failed", {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
      url: requestUrl,
      traceId,
      payload: {
        ...powerRAGPayload,
        query: powerRAGPayload.query.substring(0, 100) + "...",
      },
      headers: {
        ...headers,
        Authorization: headers.Authorization ? "Bearer ***" : undefined,
      },
      proxyAgent: !!proxyAgent,
      networkInfo: {
        host: env.LANGFUSE_POWERRAG_HOST,
        port: env.LANGFUSE_POWERRAG_PORT,
        protocol: env.LANGFUSE_POWERRAG_PROTOCOL,
      },
      requestInfo: {
        method: "POST",
        bodySize: JSON.stringify(powerRAGPayload).length,
        hasApiKey: !!apiKey,
        streaming,
      },
    });
    throw error;
  }
}

// 手动创建trace的辅助函数
async function createManualTrace({
  traceId,
  projectId,
  environment,
  name,
  input,
  output,
  error,
  metadata,
}: {
  traceId: string;
  projectId: string;
  environment: string;
  name: string;
  input: string;
  output: string | null;
  error?: string;
  metadata: Record<string, any>;
}): Promise<void> {
  try {
    logger.info("开始创建手动trace", {
      traceId,
      projectId,
      environment,
      name,
      hasError: !!error,
      inputLength: input.length,
      outputLength: output?.length || 0,
    });

    // 使用静态导入，确保模块可用
    const { processEventBatch } = await import(
      "../ingestion/processEventBatch.js"
    );
    const { eventTypes } = await import("../ingestion/types.js");
    const { v4: uuidv4 } = await import("uuid");

    // 创建trace事件
    const eventId = uuidv4();

    // 使用传入的时间信息，如果没有则使用当前时间
    const startTime =
      metadata?.startTime instanceof Date ? metadata.startTime : new Date();
    const endTime =
      metadata?.endTime instanceof Date ? metadata.endTime : new Date();

    // 明确设置为东8区（UTC+8）
    // 获取UTC时间并加上8小时偏移
    const utcTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000);

    // 创建东8区时间的ISO字符串，格式：YYYY-MM-DDTHH:mm:ss.sss+08:00
    const year = utcTime.getUTCFullYear();
    const month = String(utcTime.getUTCMonth() + 1).padStart(2, "0");
    const day = String(utcTime.getUTCDate()).padStart(2, "0");
    const hours = String(utcTime.getUTCHours()).padStart(2, "0");
    const minutes = String(utcTime.getUTCMinutes()).padStart(2, "0");
    const seconds = String(utcTime.getUTCSeconds()).padStart(2, "0");
    const milliseconds = String(utcTime.getUTCMilliseconds()).padStart(3, "0");

    const timestampWithOffset = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`;

    const traceEvent = {
      id: eventId,
      type: eventTypes.TRACE_CREATE,
      timestamp: timestampWithOffset,
      metadata: {
        manualTracing: true, // 标记为手动埋点
        provider: "PowerRAG",
        createdAt: timestampWithOffset,
      },
      body: {
        id: traceId,
        timestamp: timestampWithOffset,
        name: name,
        input: input,
        output: output,
        environment: environment,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metadata: {
          ...metadata,
          manualTracing: true, // 标记为手动埋点
          provider: "PowerRAG",
          createdAt: timestampWithOffset,
          duration: endTime.getTime() - startTime.getTime(), // 计算耗时（毫秒）
          // 确保所有Date对象都转换为ISO字符串
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
        public: false, // 默认私有
        tags: ["powerrag", "manual-tracing"], // 添加标签以便识别
      },
    };

    // 创建认证检查对象
    const authCheck = {
      validKey: true as const,
      scope: {
        projectId:
          projectId || env.LANGFUSE_PROJECT_ID || "powerrag-default-project", // 确保projectId有值，优先级：参数 > 环境变量 > 默认值
        accessLevel: "project" as const,
        // 对于内部使用，其他字段是可选的
      },
    };

    let result;
    try {
      result = await processEventBatch([traceEvent], authCheck, {
        isLangfuseInternal: false,
      });
    } catch (error) {
      logger.error("processEventBatch调用异常", {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        errorConstructor: error?.constructor?.name,
        errorPrototype: Object.getPrototypeOf(error)?.constructor?.name,
        traceId,
        projectId,
        eventId,
        context: {
          traceEventType: traceEvent.type,
          traceEventBodyKeys: Object.keys(traceEvent.body),
          authCheckValidKey: authCheck.validKey,
          authCheckScopeKeys: Object.keys(authCheck.scope),
          isLangfuseInternal: false,
        },
        completion:
          "processEventBatch调用过程中发生异常，记录详细的错误信息和上下文",
      });
      throw error;
    }

    if (result.errors.length > 0) {
      const error = result.errors[0];
      logger.error("手动trace创建失败 - processEventBatch错误", {
        error: error.error || error.message,
        status: error.status,
        traceId,
        projectId,
        eventId,
      });
      throw new Error(
        `Failed to create trace: ${error.error || error.message} (Status: ${error.status})`,
      );
    }

    logger.info("手动trace创建成功", {
      traceId,
      projectId,
      eventId,
      successes: result.successes.length,
    });
  } catch (error) {
    logger.error("手动trace创建失败", {
      error: error instanceof Error ? error.message : String(error),
      traceId,
      projectId,
      environment,
      name,
    });
    throw error;
  }
}
