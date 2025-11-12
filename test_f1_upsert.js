#!/usr/bin/env node

// Test script to debug upsertScore function
const {
  upsertScore,
} = require("./packages/shared/dist/src/server/repositories/scores");

async function testUpsertScore() {
  console.log("🧪 Testing upsertScore function...");

  const testScoreData = {
    id: "test_context_f1_123456789",
    name: "Context F1",
    value: 0.85,
    string_value: null,
    source: "MODEL",
    data_type: "NUMERIC",
    comment: "Test F1 score",
    trace_id: "test_trace_123",
    observation_id: null,
    session_id: null,
    dataset_run_id: null,
    project_id: "cmew8ey3w0008hz4opti632jf",
    environment: "production",
    author_user_id: "test_user",
    metadata: {},
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    event_ts: new Date().toISOString(),
    is_deleted: 0,
  };

  console.log("📊 Test score data:", JSON.stringify(testScoreData, null, 2));

  try {
    console.log("🚀 Calling upsertScore...");
    await upsertScore(testScoreData);
    console.log("✅ upsertScore completed successfully");
  } catch (error) {
    console.error("❌ upsertScore failed:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
  }
}

// Run the test
testUpsertScore().catch(console.error);
