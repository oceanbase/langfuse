export const DATASET_TABS = {
  RUNS: "runs",
  ITEMS: "items",
} as const;

export type DatasetTab = (typeof DATASET_TABS)[keyof typeof DATASET_TABS];

export const getDatasetTabs = (
  projectId: string,
  datasetId: string,
  t: (key: string) => string,
) => {
  return [
    {
      value: DATASET_TABS.RUNS,
      label: t("dataset.tabs.runs"),
      href: `/project/${projectId}/datasets/${datasetId}`,
    },
    {
      value: DATASET_TABS.ITEMS,
      label: t("dataset.tabs.items"),
      href: `/project/${projectId}/datasets/${datasetId}/items`,
    },
  ];
};
