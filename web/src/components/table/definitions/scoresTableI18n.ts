import {
  type ColumnDefinition,
  ScoreSource,
  ScoreDataType,
  formatColumnOptions,
  type SingleValueOption,
} from "@langfuse/shared";

export const getScoresTableCols = (
  t: (key: string) => string,
): ColumnDefinition[] => [
  {
    name: t("common.labels.traceId"),
    id: "traceId",
    type: "string",
    internal: 's."trace_id"',
  },
  {
    name: t("common.labels.traceName"),
    id: "traceName",
    type: "string",
    internal: 't."name"',
    nullable: true,
  },
  {
    name: t("common.labels.observationId"),
    id: "observationId",
    type: "string",
    internal: 's."observation_id"',
  },
  {
    name: t("common.labels.timestamp"),
    id: "timestamp",
    type: "datetime",
    internal: 's."timestamp"',
  },
  {
    name: t("common.labels.source"),
    id: "source",
    type: "stringOptions",
    internal: 's."source"::text',
    options: Object.values(ScoreSource).map((value) => ({ value })),
  },
  {
    name: t("common.labels.dataType"),
    id: "dataType",
    type: "stringOptions",
    internal: 's."data_type"::text',
    options: Object.values(ScoreDataType).map((value) => ({ value })),
  },
  {
    name: t("common.labels.name"),
    id: "name",
    type: "stringOptions",
    internal: 's."name"',
    options: [], // to be added at runtime
  },
  {
    name: t("common.labels.value"),
    id: "value",
    type: "number",
    internal: 's."value"',
  },
  {
    name: t("common.labels.userId"),
    id: "userId",
    type: "string",
    internal: 't."user_id"',
    nullable: true,
  },
  {
    name: t("common.labels.traceTags"),
    id: "tags",
    type: "arrayOptions",
    internal: 't."tags"',
    options: [], // to be added at runtime
    nullable: true,
  },
];

export type ScoreOptions = {
  name: Array<SingleValueOption>;
  tags: Array<SingleValueOption>;
};

export function getScoresTableColsWithOptions(
  t: (key: string) => string,
  options?: ScoreOptions,
): ColumnDefinition[] {
  return getScoresTableCols(t).map((col) => {
    if (col.id === "name") {
      return formatColumnOptions(col, options?.name ?? []);
    }
    if (col.id === "tags") {
      return formatColumnOptions(col, options?.tags ?? []);
    }
    return col;
  });
}
