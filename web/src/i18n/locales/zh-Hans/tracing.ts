const translation = {
  trace: {
    pages: {
      title: "跟踪",
      description: "跟踪表示单个函数/API 调用。跟踪包含观察。查看文档了解更多信息。",
    },
    actions: {
      deleted: "跟踪已删除",
      deletedDescription: "选定的跟踪将被删除。跟踪是异步删除的，可能继续可见最多 15 分钟。",
      search: "搜索",
      collapseAll: "全部折叠",
      expandAll: "全部展开",
      downloadAsJson: "下载跟踪为 JSON",
    },
    errors: {
      notFound: "未找到跟踪",
      notFoundDescription: "跟踪仍在处理中或已被删除。",
      sdkUpgradeRequired: "请升级 SDK，因为 URL Schema 已更改。",
      noAccess: "您无权访问此跟踪。",
    },
    ids: {
      traceId: "跟踪 ID",
      observationId: "观察 ID",
      copyId: "复制 ID",
    },
    io: {
      statusMessage: "状态消息",
      additionalInput: "附加输入",
      placeholder: "占位符",
      unnamedPlaceholder: "未命名占位符",
      hideHistory: "隐藏历史",
    },
    tableHeaders: {
      observationLevels: "观察级别",
      traceName: "跟踪名称",
      inputTokens: "输入 Tokens",
      outputTokens: "输出 Tokens",
      inputCost: "输入成本",
      outputCost: "输出成本",
    },
    breakdown: {
      costBreakdown: "成本分解",
      usageBreakdown: "使用分解",
      inputCost: "输入成本",
      outputCost: "输出成本",
      inputUsage: "输入使用",
      outputUsage: "输出使用",
      totalCost: "总成本",
      totalUsage: "总使用",
      otherCost: "其他成本",
      otherUsage: "其他使用",
    },
    observation: {
      viewModelDetails: "查看模型详情",
      aggregatedDuration: "所有子观察的聚合持续时间",
      aggregatedCost: "所有子观察的聚合成本",
    },
    common: {
      metadata: "元数据",
      viewOptions: "视图选项",
      traces: "跟踪",
    },
  },
  observation: {
    pages: {
      title: "跟踪",
      description: "观察捕获应用程序中的单个函数调用。查看文档了解更多信息。",
    },
  },
  onboarding: {
    getStartedTitle: "开始使用 LLM 跟踪",
    getStartedDescription: "跟踪允许您跟踪应用程序/代理中的每个 LLM 调用和其他相关逻辑。Langfuse 中的嵌套跟踪有助于理解正在发生的事情并识别问题的根本原因。",
    configureTracing: "配置跟踪",
    viewDocumentation: "查看文档",
  },
  detail: {
    title: "跟踪详情",
  },
  tabs: {
    preview: "预览",
    scores: "评分",
    tree: "树形",
    timeline: "时间线",
  },
  features: {
    fullContextCapture: {
      title: "完整上下文捕获",
      description: "跟踪完整的执行流程，包括 API 调用、上下文、提示、并行性等",
    },
    costMonitoring: {
      title: "成本监控",
      description: "跟踪应用程序中的模型使用情况和成本",
    },
    basisForEvaluation: {
      title: "评估基础",
      description: "添加评估分数以识别问题并跟踪指标随时间的变化",
    },
    openAndMultimodal: {
      title: "开放和多模态",
      description: "Langfuse 跟踪可以包含图像、音频和其他模态。您可以完全自定义它们以满足您的需求",
    },
  },
};

export default translation;
