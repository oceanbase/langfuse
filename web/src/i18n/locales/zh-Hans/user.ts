const translation = {
  pages: {
    title: "用户",
    description: "通过向您的跟踪添加 userId 将 Langfuse 中的数据归因于用户。查看文档了解更多信息。",
  },
  onboarding: {
    getStartedTitle: "开始使用用户跟踪",
    getStartedDescription: "将成本、评估和其他 LLM 应用程序指标与特定用户关联。开始跟踪用户以更好地了解他们如何与您的 LLM 应用程序交互。",
    gettingStarted: "要开始跟踪用户，您需要向跟踪添加 'userId'。",
  },
  features: {
    trackUserInteractions: {
      title: "跟踪用户交互",
      description: "通过向跟踪添加 userId 将 Langfuse 中的数据归因于特定用户",
    },
    analyzeUserBehavior: {
      title: "分析用户行为",
      description: "了解不同用户如何与您的 LLM 应用程序交互",
    },
    filterByUserSegments: {
      title: "按用户群体筛选",
      description: "比较不同用户群体的性能以识别模式",
    },
    monitorUsageMetrics: {
      title: "监控使用指标",
      description: "按用户跟踪 token 使用情况、成本和其他指标",
    },
  },
  filters: {
    timestamp: "时间戳",
  },
  tabs: {
    traces: "跟踪",
    sessions: "会话",
    scores: "评分",
  },
  noTraces: "暂无跟踪",
  table: {
    userId: "用户 ID",
    userIdDescription: "在 Langfuse 中记录的用户唯一标识符。查看文档了解如何设置此标识符的更多详细信息。",
    firstEvent: "首次事件",
    firstEventDescription: "为此用户记录的最早跟踪。",
    lastEvent: "最后事件",
    lastEventDescription: "为此用户记录的最新跟踪。",
    totalEvents: "总事件数",
    totalEventsDescription: "用户的总事件数，包括跟踪和观察。查看数据模型了解更多详细信息。",
    totalTokens: "总 token 数",
    totalTokensDescription: "用户在所有生成中使用的总 token 数。",
    totalCost: "总成本",
    totalCostDescription: "用户在所有生成中的总成本。",
    noEventYet: "暂无事件",
    environment: "环境",
  },
};

export default translation;
