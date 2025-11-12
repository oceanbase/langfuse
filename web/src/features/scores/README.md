# Scores Feature

## Overview

The Scores feature in Langfuse provides comprehensive evaluation metrics for traces, observations, and sessions. It supports both manual and automated scoring with various data types including numeric, categorical, and boolean values.

## Features

### Automatic Context F1 Score Creation

The system now automatically creates **Context F1** scores in the database when both **Context Precision** and **Context Recall** scores are present for a trace.

#### How it works

1. **Detection**: The system automatically detects when a trace has both "Context Precision" and "Context Recall" scores
2. **Calculation**: F1 score is calculated using the formula: `F1 = 2 * (precision * recall) / (precision + recall)`
3. **Edge case handling**: When precision + recall = 0, F1 is set to 0.0
4. **Database Storage**: The calculated F1 score is stored as a real score record in the database
5. **Integration**: The Context F1 score appears alongside other scores in all UI components and API responses

#### Formula

```
F1 = 2 * (precision * recall) / (precision + recall)
```

Where:

- `precision` = Context Precision score value
- `recall` = Context Recall score value

#### Example

If a trace has:

- Context Precision = 0.8
- Context Recall = 0.6

Then Context F1 will be automatically calculated and stored as:

```
F1 = 2 * (0.8 * 0.6) / (0.8 + 0.6) = 2 * 0.48 / 1.4 = 0.686
```

#### Implementation Details

- The calculation and creation happens in the `traces.metrics` API endpoint
- Context F1 is created as a real score record with:
  - Name: "Context F1"
  - Type: NUMERIC
  - Source: Same as the Context Precision score
  - Comment: "Automatically calculated from Context Precision (0.8) and Context Recall (0.6)"
  - Stored in the database with a unique ID
  - Available through all score-related APIs and queries

#### Benefits

1. **Persistent**: F1 scores are stored in the database and persist across sessions
2. **Queryable**: Can be filtered, sorted, and analyzed like any other score
3. **Consistent**: Uses the same F1 calculation formula across all traces
4. **Integrated**: Appears in all score-related UI components and dashboards
5. **Performance**: Calculation happens once when scores are first accessed, then cached in database

## Usage

### For Users

Context F1 will automatically appear in your trace lists and detail views when both Context Precision and Context Recall are present. The F1 score is stored as a real score record, so it will persist and be available through all score-related queries and filters.

### For Developers

The automatic calculation and creation is handled by the Context F1 calculation logic integrated into the `traces.metrics` API endpoint. To extend this functionality for other metrics, you can:

1. Add similar calculation logic directly in the appropriate API endpoint
2. Ensure proper error handling and logging
3. Follow the same pattern of checking for required scores and creating new ones

## Testing

Comprehensive tests are available in:

- `web/src/features/scores/lib/__tests__/aggregateScores.test.ts` - Tests for the basic score aggregation functionality

The tests cover:

- Score aggregation functionality
- Score grouping and averaging
- Edge cases and error handling

## Future Enhancements

Potential areas for expansion:

- Support for other F1-like metrics (e.g., weighted F1)
- Configurable calculation formulas
- Support for different precision/recall score name patterns
- Performance optimizations for large-scale deployments
