export const DASHBOARD_TABS = {
  DASHBOARDS: "dashboards",
  WIDGETS: "widgets",
} as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[keyof typeof DASHBOARD_TABS];

export const getDashboardTabs = (
  projectId: string,
  t: (key: string) => string,
) => [
  {
    value: DASHBOARD_TABS.DASHBOARDS,
    label: t("common.labels.dashboards"),
    href: `/project/${projectId}/dashboards`,
  },
  {
    value: DASHBOARD_TABS.WIDGETS,
    label: t("common.labels.widgets"),
    href: `/project/${projectId}/widgets`,
  },
];
