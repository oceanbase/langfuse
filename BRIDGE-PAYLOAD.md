# Bridge Payload 配置

本文档提供了 RAGFlow Bridge 支持的完整 payload 示例，包括 Chat Assistant 和 Agent 两种模式。

## 目录

- [Chat Assistant 模式](#chat-assistant-模式)
- [Agent 模式](#agent-模式)
- [字段说明](#字段说明)
- [模式选择](#模式选择)
- [响应格式](#响应格式)
- [注意事项](#注意事项)

## Chat Assistant 模式

使用 Chat Assistant 模式时，需要提供 `ragflow_chat_id`。

### 基础示例（不传 session_id，让 RAGFlow 自动生成）

```json
{
  "ragflow_api_key": "ragflow-Y3ZWZiNmY4YmUxMjExZjBiNWY0MDI0Mm",
  "ragflow_chat_id": "74e4ba92be1211f0847a0242ac120003"
}
```

### 基础示例（传入 session_id，继续已有会话）

```json
{
  "ragflow_api_key": "ragflow-Y3ZWZiNmY4YmUxMjExZjBiNWY0MDI0Mm",
  "ragflow_chat_id": "74e4ba92be1211f0847a0242ac120003",
  "ragflow_session_id": "fd36f871023b4c5ba86f22cb40ac8f57"
}
```

## Agent 模式

使用 Agent 模式时，需要提供 `ragflow_agent_id`。

### 基础示例（无 Begin 组件变量）

```json
{
  "ragflow_api_key": "ragflow-Y3ZWZiNmY4YmUxMjExZjBiNWY0MDI0Mm",
  "ragflow_agent_id": "93dacfc6be1d11f08b800242ac120003"
}
```

### 带 session_id 的示例

```json
{
  "ragflow_api_key": "ragflow-Y3ZWZiNmY4YmUxMjExZjBiNWY0MDI0Mm",
  "ragflow_agent_id": "93dacfc6be1d11f08b800242ac120003",
  "ragflow_session_id": "cb2f385cb86211efa36e0242ac120005"
}
```

### 带 Begin 组件变量的示例

```json
{
  "ragflow_api_key": "ragflow-Y3ZWZiNmY4YmUxMjExZjBiNWY0MDI0Mm",
  "ragflow_agent_id": "93dacfc6be1d11f08b800242ac120003",
  "ragflow_user_id": "user-12345",
  "ragflow_agent_inputs": {
    "line_var": {
      "type": "line",
      "value": "I am line_var"
    },
    "int_var": {
      "type": "integer",
      "value": 1
    },
    "paragraph_var": {
      "type": "paragraph",
      "value": "a\nb\nc"
    },
    "option_var": {
      "type": "options",
      "value": "option 2"
    },
    "boolean_var": {
      "type": "boolean",
      "value": true
    }
  }
}
```

## 字段说明

### 必需字段

| 字段名 | 说明 | Chat Assistant | Agent |
|--------|------|---------------|-------|
| `ragflow_api_key` | RAGFlow API 密钥 | ✅ | ✅ |
| `ragflow_chat_id` | Chat ID（Chat Assistant 模式必需） | ✅ | ❌ |
| `ragflow_agent_id` | Agent ID（Agent 模式必需） | ❌ | ✅ |

### 可选字段

| 字段名 | 说明 | Chat Assistant | Agent | 默认值 |
|--------|------|---------------|-------|--------|
| `ragflow_session_id` | 会话 ID（可选，不提供时 RAGFlow 会自动生成新 session） | ✅ | ✅ | 无（不传此参数） |
| `ragflow_user_id` | 用户 ID（可选，Chat Assistant 模式下仅在无 session_id 时有效） | ✅ | ✅ | - |
| `ragflow_api_url` | RAGFlow API 基础 URL | ✅ | ✅ | <https://api.ragflow.io> |

### ragflow_agent_inputs 字段说明（仅 Agent 模式）

`ragflow_agent_inputs` 用于传递 Begin 组件定义的变量，格式如下：

```json
{
  "variable_name": {
    "type": "line|integer|paragraph|options|boolean",
    "value": "对应的值"
  }
}
```

支持的类型：

- `line`: 单行文本
- `integer`: 整数
- `paragraph`: 多行文本
- `options`: 选项值
- `boolean`: 布尔值

## 模式选择

系统会根据 payload 中的字段自动选择模式：

1. 如果提供了 `ragflow_agent_id`：使用 Agent 模式
   - API 端点：`/api/v1/agents/{agent_id}/completions`
   - 支持 `ragflow_agent_inputs`、`ragflow_user_id` 等字段
2. 如果提供了 `ragflow_chat_id`：使用 Chat Assistant 模式
   - API 端点：`/api/v1/chats/{chat_id}/completions`
   - 需要 `ragflow_session_id`
3. 如果两者都提供：优先使用 Agent 模式
4. 如果两者都不提供：返回错误

## 响应格式

### Chat Assistant 模式响应

```json
{
  "code": 0,
  "data": {
    "answer": "回答内容",
    "reference": {
      "chunks": [
        {
          "content": "chunk内容",
          "document_name": "文档名",
          "similarity": 0.95,
          "dataset_id": "dataset-id",
          "document_id": "doc-id"
        }
      ]
    },
    "id": "message-id",
    "created_at": 1234567890,
    "session_id": "session-id"
  }
}
```

### Agent 模式响应（非流式）

```json
{
  "code": 0,
  "data": {
    "created_at": 1756363177,
    "data": {
      "content": "回答内容",
      "created_at": 18129.044975627,
      "elapsed_time": 10.0157331670016,
      "inputs": {
        "var1": {
          "value": "I am var1"
        }
      },
      "outputs": {
        "content": "回答内容"
      },
      "reference": {
        "chunks": {
          "20": {
            "content": "chunk内容",
            "document_id": "doc-id",
            "document_name": "文档名",
            "dataset_id": "dataset-id",
            "id": "chunk-id",
            "similarity": 0.5705525104787287,
            "vector_similarity": 0.7351750337624289,
            "term_similarity": 0.5000000005
          }
        },
        "doc_aggs": {
          "INSTALL22.md": {
            "doc_name": "INSTALL22.md",
            "doc_id": "doc-id",
            "count": 3
          }
        }
      }
    },
    "event": "workflow_finished",
    "message_id": "message-id",
    "session_id": "session-id",
    "task_id": "task-id"
  }
}
```

## 注意事项

1. **API Key 优先级**：
   - 优先使用 payload 中的 `ragflow_api_key`
   - 如果未提供，使用环境变量或配置文件中的默认值

2. **Session ID**：
   - Chat Assistant 模式：可选（如果不提供，RAGFlow 会自动生成新的 session）
   - Agent 模式：可选（如果不提供，RAGFlow 会自动生成新的 session）
   - 如果提供了 `session_id`，会使用该 session 继续对话
   - 如果没有提供 `session_id`，RAGFlow 会在响应中返回新生成的 `session_id`

3. **流式输出**：
   - 固定为非流式模式（`stream: false`），不允许从 payload 覆盖
   - 此设计是为了确保能够获取完整响应进行评测
   - 响应格式为完整的 JSON 响应

4. **URL 自定义**：
   - 如果 `ragflow_api_url` 包含完整路径（如 <https://api.ragflow.io/api/v1/agents/{agent_id}/completions>），系统会直接使用
   - 如果只提供基础 URL（如 <https://api.ragflow.io>），系统会自动拼接正确的端点路径
