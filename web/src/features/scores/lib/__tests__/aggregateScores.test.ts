import { aggregateScores } from "../aggregateScores";
import { type APIScoreV2 } from "@langfuse/shared";

describe("aggregateScores", () => {
  it("should aggregate numeric scores correctly", () => {
    const mockScores: APIScoreV2[] = [
      {
        id: "1",
        name: "Test Score",
        value: 0.8,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "Test score",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = aggregateScores(mockScores);

    expect(result["Test Score-API-NUMERIC"]).toBeDefined();
    expect(result["Test Score-API-NUMERIC"].type).toBe("NUMERIC");
    expect((result["Test Score-API-NUMERIC"] as any).average).toBe(0.8);
  });

  it("should aggregate categorical scores correctly", () => {
    const mockScores: APIScoreV2[] = [
      {
        id: "1",
        name: "Category Score",
        value: 0,
        stringValue: "good",
        source: "EVAL",
        dataType: "CATEGORICAL",
        comment: "Category test",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = aggregateScores(mockScores);

    expect(result["Category Score-EVAL-CATEGORICAL"]).toBeDefined();
    expect(result["Category Score-EVAL-CATEGORICAL"].type).toBe("CATEGORICAL");
    expect(result["Category Score-EVAL-CATEGORICAL"].values).toEqual(["good"]);
  });

  it("should handle multiple scores with the same name", () => {
    const mockScores: APIScoreV2[] = [
      {
        id: "1",
        name: "Multi Score",
        value: 0.5,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "First score",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "Multi Score",
        value: 0.7,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "Second score",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = aggregateScores(mockScores);

    expect(result["Multi Score-API-NUMERIC"]).toBeDefined();
    expect((result["Multi Score-API-NUMERIC"] as any).average).toBe(0.6); // (0.5 + 0.7) / 2
    expect((result["Multi Score-API-NUMERIC"] as any).values).toEqual([
      0.5, 0.7,
    ]);
  });

  it("should preserve comment and id for single scores", () => {
    const mockScores: APIScoreV2[] = [
      {
        id: "1",
        name: "Single Score",
        value: 0.9,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "Single score comment",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = aggregateScores(mockScores);

    expect((result["Single Score-API-NUMERIC"] as any).comment).toBe(
      "Single score comment",
    );
    expect((result["Single Score-API-NUMERIC"] as any).id).toBe("1");
  });

  it("should not preserve comment and id for multiple scores", () => {
    const mockScores: APIScoreV2[] = [
      {
        id: "1",
        name: "Multi Score",
        value: 0.5,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "First score",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "2",
        name: "Multi Score",
        value: 0.7,
        stringValue: null,
        source: "API",
        dataType: "NUMERIC",
        comment: "Second score",
        traceId: "trace1",
        observationId: null,
        sessionId: null,
        datasetRunId: null,
        timestamp: new Date(),
        projectId: "project1",
        environment: "production",
        authorUserId: "user1",
        configId: null,
        queueId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = aggregateScores(mockScores);

    expect((result["Multi Score-API-NUMERIC"] as any).comment).toBeUndefined();
    expect((result["Multi Score-API-NUMERIC"] as any).id).toBeUndefined();
  });
});
