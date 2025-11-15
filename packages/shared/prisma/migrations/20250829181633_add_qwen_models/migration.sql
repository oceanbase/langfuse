-- 添加千问模型到 models 表
INSERT INTO models (
  id,
  project_id,
  model_name,
  match_pattern,
  start_date,
  input_price,
  output_price,
  total_price,
  unit,
  tokenizer_id,
  tokenizer_config
)
VALUES
  -- 千问模型 - 使用 OpenAI 兼容的 API
  ('qwen-plus-model', NULL, 'qwen-plus', '(?i)^(qwen-plus)$', NULL, 0.00001, 0.00003, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
  ('qwen-turbo-model', NULL, 'qwen-turbo', '(?i)^(qwen-turbo)$', NULL, 0.000005, 0.000015, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
  ('qwen-max-model', NULL, 'qwen-max', '(?i)^(qwen-max)$', NULL, 0.00002, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
  ('qwen-max-longcontext-model', NULL, 'qwen-max-longcontext', '(?i)^(qwen-max-longcontext)$', NULL, 0.00002, 0.00006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
  ('qwen2-7b-model', NULL, 'qwen2-7b', '(?i)^(qwen2-7b)$', NULL, 0.000002, 0.000006, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-3.5-turbo" }'),
  ('qwen2-14b-model', NULL, 'qwen2-14b', '(?i)^(qwen2-14b)$', NULL, 0.000004, 0.000012, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }'),
  ('qwen2-72b-model', NULL, 'qwen2-72b', '(?i)^(qwen2-72b)$', NULL, 0.000008, 0.000024, NULL, 'TOKENS', 'openai', '{ "tokensPerMessage": 3, "tokensPerName": 1, "tokenizerModel": "gpt-4" }');

