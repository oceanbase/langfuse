const translation = {
  trace: {
    pages: {
      title: "Traces",
      description: "Traces represent a single function/API call. Traces contain observations. View documentation to learn more.",
    },
    actions: {
      deleted: "Trace deleted",
      deletedDescription: "Selected traces will be deleted. Traces are deleted asynchronously and may continue to be visible for up to 15 minutes.",
      search: "Search",
      collapseAll: "Collapse all",
      expandAll: "Expand all",
      downloadAsJson: "Download trace as JSON",
    },
    errors: {
      notFound: "Trace not found",
      notFoundDescription: "The trace is still being processed or has been deleted.",
      sdkUpgradeRequired: "Please upgrade the SDK as the URL schema has changed.",
      noAccess: "You do not have access to this trace.",
    },
    ids: {
      traceId: "Trace ID",
      observationId: "Observation ID",
      copyId: "Copy ID",
    },
    io: {
      statusMessage: "Status message",
      additionalInput: "Additional input",
      placeholder: "Placeholder",
      unnamedPlaceholder: "Unnamed placeholder",
      hideHistory: "Hide history",
    },
    tableHeaders: {
      observationLevels: "Observation Levels",
      traceName: "Trace Name",
      inputTokens: "Input Tokens",
      outputTokens: "Output Tokens",
      inputCost: "Input Cost",
      outputCost: "Output Cost",
    },
    breakdown: {
      costBreakdown: "Cost breakdown",
      usageBreakdown: "Usage breakdown",
      inputCost: "Input cost",
      outputCost: "Output cost",
      inputUsage: "Input usage",
      outputUsage: "Output usage",
      totalCost: "Total cost",
      totalUsage: "Total usage",
      otherCost: "Other cost",
      otherUsage: "Other usage",
    },
    observation: {
      viewModelDetails: "View model details",
      aggregatedDuration: "Aggregated duration of all child observations",
      aggregatedCost: "Aggregated cost of all child observations",
    },
    common: {
      metadata: "Metadata",
      viewOptions: "View options",
      traces: "Traces",
    },
  },
  observation: {
    pages: {
      title: "Traces",
      description: "Observations capture individual function calls in your application. View documentation to learn more.",
    },
  },
  onboarding: {
    getStartedTitle: "Get Started with LLM Tracing",
    getStartedDescription:
      "Traces allow you to track every LLM call and other relevant logic in your app/agent. Nested traces in Langfuse help to understand what is happening and identify the root cause of problems.",
    configureTracing: "Configure Tracing",
    viewDocumentation: "View Documentation",
  },
  detail: {
    title: "Trace Detail",
  },
  tabs: {
    preview: "Preview",
    scores: "Scores",
    tree: "Tree",
    timeline: "Timeline",
  },
  features: {
    fullContextCapture: {
      title: "Full context capture",
      description: "Track the complete execution flow including API calls, context, prompts, parallelism and more",
    },
    costMonitoring: {
      title: "Cost monitoring",
      description: "Track model usage and costs across your application",
    },
    basisForEvaluation: {
      title: "Basis for evaluation",
      description: "Add evaluation scores to identify issues and track metrics over time",
    },
    openAndMultimodal: {
      title: "Open and Multi-modal",
      description: "Langfuse traces can include images, audio, and other modalities. You can fully customize them to fit your needs",
    },
  },
};

export default translation;
