# Langfuse 企业版 - 基于 Langfuse 的二次开发版本

<div align="center">

![Langfuse](https://img.shields.io/badge/Langfuse-3.103.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![Status](https://img.shields.io/badge/Status-Production-brightgreen)

**基于 [Langfuse](https://github.com/langfuse/langfuse) 开源项目的企业级 LLM 工程平台**

[功能特性](#-核心特性) • [快速开始](#-快速开始) • [部署指南](#-部署指南) • [配置说明](#-配置说明) • [开发文档](#-开发文档)

</div>

---

## 📖 项目简介

本项目是基于 [Langfuse](https://github.com/langfuse/langfuse) 开源 LLM 工程平台的企业级二次开发版本。在保留 Langfuse 核心功能的基础上，我们针对企业级应用场景进行了深度定制和优化，包括：

- 🔌 **PowerRAG 深度集成**：原生支持 PowerRAG 社区版和商业版作为 LLM 适配器
- 🚀 **性能优化**：ClickHouse AMT 表优化、连接池优化等
- 🏢 **企业级部署**：Harbor 镜像仓库支持、一键部署脚本
- ⚙️ **灵活配置**：丰富的环境变量配置、初始化配置
- 📊 **增强功能**：国际化、开源外部评估系统 Bridge、数据集运行优化

## ✨ 核心特性

### 🎯 基于 Langfuse 的核心能力

- **LLM 应用可观察性**：完整的追踪、监控和调试能力
- **提示词管理**：集中管理、版本控制和协作迭代
- **评估系统**：支持 LLM-as-a-judge、用户反馈、手动标注
- **数据集管理**：测试集和基准测试支持
- **LLM Playground**：交互式提示词测试和迭代
- **综合 API**：完整的 OpenAPI 规范和类型化 SDK

### 🚀 二次开发增强特性

#### 1. PowerRAG 深度集成

- 原生支持 Bridge 服务，支持 PowerRAG 应用的调用和评测
- 自动追踪 PowerRAG 调用链路
- 支持流式和非流式响应
- 完整的错误处理和日志记录

#### 2. 性能优化

- **ClickHouse AMT 表优化**：使用聚合合并树表提升查询性能
- **连接池优化**：PostgreSQL 连接池参数调优
- **查询性能提升**：30天内数据使用 AMT 表，历史数据使用原始表

#### 3. 企业级部署

- **Harbor 镜像仓库支持**：企业级容器镜像管理
- **一键部署脚本**：自动化部署流程
- **灵活端口配置**：支持自定义端口映射
- **初始化配置**：支持预配置组织、项目、用户

#### 4. 增强功能

- **数据集运行优化**：支持 ClickHouse 中的数据集运行项目读写
- **实验性功能开关**：灵活的功能开关控制
- **增强的日志系统**：详细的调试和监控日志

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 一键部署

```bash
# 克隆仓库
git clone <your-repo-url>
cd langfuse

# 复制环境变量模板
cp env.template .env

# 编辑环境变量（初始化变量、登录的重定向地址、镜像版本、harbor信息等）
vim .env

# 构建镜像
./deploy.sh build

# 完整部署（包含中间件）
./deploy.sh start full

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs
```

## 📦 部署指南

### Docker Compose 部署

本项目提供了完整的 Docker Compose 部署方案，包含以下服务：

| 服务 | 说明 | 端口 |
|------|------|------|
| langfuse-web | Web 前端服务 | 3001 |
| langfuse-worker | 后台任务处理服务 | - |
| postgres | PostgreSQL 数据库 | 5432 |
| clickhouse | ClickHouse 分析数据库 | 8123, 9010 |
| redis | Redis 缓存服务 | 6379 |
| minio | MinIO 对象存储 | 9090, 9091 |

### 部署脚本使用

```bash
# 构建镜像
./deploy.sh build [web|worker|]
# - web: 仅启动 Web 服务
# - worker: 仅启动 Worker 服务  
# - 不指定: 启动所有应用服务（默认，不包含中间件）

# 启动服务
./deploy.sh start [web|worker|all]
# - web: 仅启动 Web 服务
# - worker: 仅启动 Worker 服务  
# - all: 启动所有应用服务（默认，不包含中间件）
# - full: 启动完整服务（包含中间件）

# 拉取镜像并启动
./deploy.sh start-with-pull [web|worker|all]

# 停止服务
./deploy.sh stop [web|worker|all]

# 重启服务
./deploy.sh restart [web|worker|all]

# 查看状态
./deploy.sh status

# 查看日志
./deploy.sh logs [服务名]

# 清理资源
./deploy.sh cleanup

./deploy.sh upload                   # 上传所有镜像到 Harbor 仓库
./deploy.sh upload web               # 仅上传 Web 镜像到 Harbor 仓库
./deploy.sh upload worker            # 仅上传 Worker 镜像到 Harbor 仓库

./deploy.sh start-with-pull          # 从 Harbor 拉取镜像并启动所有应用服务
./deploy.sh start-with-pull web     # 从 Harbor 拉取镜像并启动 Web 服务
./deploy.sh start-with-pull worker   # 从 Harbor 拉取镜像并启动 Worker 服务
./deploy.sh start-with-pull full     # 从 Harbor 拉取镜像并启动完整服务
```

#### Harbor 镜像仓库配置

如果使用 Harbor 作为镜像仓库：

```bash
# 配置 Harbor 认证信息
HARBOR_USERNAME=your_username
HARBOR_PASSWORD=your_password

# 推送镜像到 Harbor
./deploy.sh upload harbor-address
```

#### 初始化配置（可选）

预配置组织、项目和用户：

```bash
LANGFUSE_INIT_ORG_ID=your_org_id
LANGFUSE_INIT_ORG_NAME=your_org_name
LANGFUSE_INIT_PROJECT_ID=your_project_id
LANGFUSE_INIT_PROJECT_NAME=your_project_name
LANGFUSE_INIT_PROJECT_PUBLIC_KEY=pk-lf-...
LANGFUSE_INIT_PROJECT_SECRET_KEY=sk-lf-...
LANGFUSE_INIT_USER_EMAIL=admin@example.com
LANGFUSE_INIT_USER_NAME=admin
LANGFUSE_INIT_USER_PASSWORD=your_password
```

#### 启动服务

```bash
# 使用构建好的镜像启动
docker compose -f docker-compose.build.yml up -d

# 或使用部署脚本
./deploy.sh start
```

## ⚙️ 配置说明

### 核心配置项

#### 数据库配置

```bash
# PostgreSQL 连接配置
DATABASE_URL=postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=20
DIRECT_URL=postgresql://user:password@host:5432/database

# ClickHouse 配置
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_USER=clickhouse
CLICKHOUSE_PASSWORD=clickhouse
CLICKHOUSE_MAX_OPEN_CONNECTIONS=50
```

### 完整配置示例

详细的环境变量配置请参考 `env.template` 文件。

### Bridge 桥接器配置

Bridge 桥接器用于配置远程 PowerRAG 社区版应用调用和评分（通过 SDK/API）。

#### 配置远程数据集运行触发器

在 Langfuse 中编辑远程数据集运行触发器（Remote Dataset Run Trigger）时，需要配置以下信息：

- **Webhook URL**：`http://<部署的Bridge服务host>:9002/webhook/dataset/process-items`
  - 将 `<部署的Bridge服务host>` 替换为实际的 Bridge 服务主机地址

- **默认配置**：参考 [BRIDGE-PAYLOAD.md](./BRIDGE-PAYLOAD.md) 文档了解完整的 payload 配置说明

## 🔌 集成说明

本项目完全兼容 Langfuse 的所有集成：

- **SDK**：Python、JavaScript/TypeScript
- **OpenAI**：自动追踪 OpenAI 调用
- **LangChain**：LangChain 应用集成
- **LlamaIndex**：LlamaIndex 回调系统
- **其他框架**：完全兼容 Langfuse 支持的框架

详细集成文档请参考 [Langfuse 官方文档](https://langfuse.com/docs)。

## 🛠️ 开发文档

### 项目结构

```text
langfuse/
├── web/              # Web 前端服务
├── worker/           # 后台任务处理服务
├── packages/
│   └── shared/       # 共享代码包
├── docker-compose.build.yml  # 构建和部署配置
├── deploy.sh         # 部署脚本
└── env.template      # 环境变量模板
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm run dx

# 或分别启动
pnpm run dev:web      # 启动 Web 服务
pnpm run dev:worker   # 启动 Worker 服务
```

### 构建镜像

```bash
# 构建所有镜像
./deploy.sh build

# 或使用 Docker Compose
docker compose -f docker-compose.build.yml build
```

## 📊 监控和维护

### 查看服务状态

```bash
# 使用部署脚本
./deploy.sh status

# 或使用 Docker Compose
docker compose -f docker-compose.build.yml ps
```

### 查看日志

```bash
# 查看所有服务日志
./deploy.sh logs

# 查看特定服务日志
docker compose -f docker-compose.build.yml logs -f langfuse-web
docker compose -f docker-compose.build.yml logs -f langfuse-worker
```

### 数据备份

```bash
# 备份 PostgreSQL
docker compose -f docker-compose.build.yml exec postgres \
  pg_dump -U postgres postgres > backup.sql

# 备份 ClickHouse
docker compose -f docker-compose.build.yml exec clickhouse \
  clickhouse-client --query "BACKUP DATABASE default TO Disk('backups', 'backup')"
```

## 🔒 安全建议

### 生产环境安全检查清单

- [ ] 修改所有默认密码（PostgreSQL、ClickHouse、Redis、MinIO）
- [ ] 生成安全的密钥（NEXTAUTH_SECRET、ENCRYPTION_KEY、SALT）
- [ ] 配置防火墙规则，只开放必要端口
- [ ] 使用 HTTPS/TLS 证书
- [ ] 配置定期数据备份
- [ ] 启用监控和告警
- [ ] 定期更新镜像和依赖

### 密钥生成

```bash
# 生成 NextAuth 密钥
openssl rand -base64 32

# 生成加密密钥
openssl rand -hex 32

# 生成 Salt
openssl rand -base64 16
```

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口 3001, 5432, 6379, 8123, 9090, 9091 是否被占用
   - 修改 `docker-compose.build.yml` 中的端口映射

2. **内存不足**
   - 确保系统有至少 4GB 可用内存
   - 调整 Docker 内存限制

3. **服务启动失败**
   - 查看日志：`./deploy.sh logs`
   - 检查环境变量配置
   - 确保所有依赖服务正常运行

4. **数据库连接失败**
   - 检查数据库服务是否正常启动
   - 验证连接字符串配置
   - 查看数据库日志

5. **数据迁移问题**
   - 当数据迁移没有正常完成的时候，缺少表等情况的时候，可以手动执行迁移，为了保证数据迁移正常，建议手动执行一下
   
   ```bash
   sudo docker exec langfuse-langfuse-web-1 sh -c "cd /app/packages/shared && CLICKHOUSE_CLUSTER_ENABLED=false node clickhouse/scripts/migrate.js up unclustered"
   ```

6. **跟踪 traces 列表显示不稳定**
   - 开启了 AMT 能力，某些基础表的数据没有同步到 AMT 数据表中
   - 执行同步脚本。先检查 ClickHouse 连接信息，然后执行同步：
   
   ```bash
   # 查询基础表记录的 trace 条数
   docker exec langfuse-clickhouse-1 clickhouse-client --query "SELECT count(*) as traces_count FROM traces FINAL WHERE project_id = 'cmheghiek000aqlqznqlq17c7' AND is_deleted = 0" 2>/dev/null || echo "需要检查 ClickHouse 连接"
   
   # 查询 AMT 表记录的 trace 条数
   docker exec langfuse-clickhouse-1 clickhouse-client --query "SELECT count(*) as amt_count FROM traces_all_amt WHERE project_id = 'cmheghiek000aqlqznqlq17c7'" 2>/dev/null || echo "需要检查 ClickHouse 连接"
   ```
   
   - 假如基础表和 AMT 表记录条数不一致，需要执行同步脚本：
   
   ```bash
   docker exec -i langfuse-clickhouse-1 clickhouse-client << 'EOF'
   -- 同步指定项目的数据到 traces_null 表
   INSERT INTO traces_null
   SELECT
      project_id,
      id,
      timestamp as start_time,
      null as end_time,
      name,
      metadata,
      user_id,
      session_id,
      environment,
      tags,
      version,
      release,
      bookmarked,
      public,
      [] as observation_ids,
      [] as score_ids,
      map() as cost_details,
      map() as usage_details,
      coalesce(input, '') as input,
      coalesce(output, '') as output,
      created_at,
      updated_at,
      event_ts
   FROM traces FINAL
   WHERE is_deleted = 0
   AND project_id = 'cmheghiek000aqlqznqlq17c7'
   ;
   EOF
   ```
   
   - 验证同步结果：
   
   ```bash
   docker exec langfuse-clickhouse-1 clickhouse-client --query "SELECT count(*) as amt_count FROM traces_all_amt WHERE project_id = 'cmheghiek000aqlqznqlq17c7'"
   
   docker exec langfuse-clickhouse-1 clickhouse-client --query "SELECT count(*) as amt_7d_count FROM traces_7d_amt WHERE project_id = 'cmheghiek000aqlqznqlq17c7'"
   
   docker exec langfuse-clickhouse-1 clickhouse-client --query "SELECT count(*) as amt_30d_count FROM traces_30d_amt WHERE project_id = 'cmheghiek000aqlqznqlq17c7'"
   ```
   
   三张表的数据条数保持一致，则数据同步正确。

### 获取帮助

- 查看 [powerrag-langfuse 官方文档](https://github.com/oceanbase/powerrag-docs/blob/main/README.md)
- 查看 [Langfuse 官方文档](https://langfuse.com/docs)
- 提交 Issue 到项目仓库

## 📝 更新日志

### v3.103.0

- ✨ 集成 PowerRAG 外部评测服务 langfuse-bridge服务
- ⚡ 性能优化：ClickHouse AMT 表支持
- 🔧 企业级部署：Harbor 镜像仓库支持
- 📊 数据集运行优化：ClickHouse 读写优化
- 🛠️ 部署脚本：一键部署和自动化流程

## 📄 许可证

本项目基于 [Langfuse](https://github.com/langfuse/langfuse) 开源项目，遵循 MIT 许可证。

除 `ee` 文件夹外，本仓库采用 MIT 许可证。详情请参见 [LICENSE](./LICENSE)。

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个 Star！**

Made with ❤️ by [Your Company Name]

</div>
