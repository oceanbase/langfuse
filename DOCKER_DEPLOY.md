# Langfuse Docker 部署指南

本指南介绍如何使用 Docker 部署 Langfuse 的 web 和 worker 服务。

## 📋 前置要求

- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

## 🚀 快速开始

### 方法一：一键部署（推荐）

```bash
# 运行快速启动脚本
./quick-start.sh
```

这个脚本会自动：
- 检查环境要求
- 创建环境变量文件
- 生成安全密钥
- 构建 Docker 镜像
- 启动所有服务
- 等待服务就绪

### 方法二：手动部署

```bash
# 1. 创建环境变量文件
cp env.template .env

# 2. 编辑环境变量（可选）
nano .env

# 3. 构建镜像
./deploy.sh build

# 4. 启动服务
./deploy.sh start
```

## 📁 文件说明

### 部署脚本

- `deploy.sh` - 主要的部署管理脚本
- `quick-start.sh` - 一键快速启动脚本
- `env.template` - 环境变量配置模板

### Docker 配置文件

- `docker-compose.build.yml` - 用于构建和部署的 Docker Compose 配置
- `docker-compose.yml` - 使用官方镜像的 Docker Compose 配置
- `web/Dockerfile` - Web 服务的 Dockerfile
- `worker/Dockerfile` - Worker 服务的 Dockerfile

## 🛠️ 部署脚本使用

### deploy.sh 命令

```bash
# 构建 Docker 镜像
./deploy.sh build

# 启动服务
./deploy.sh start

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs                    # 查看所有服务日志
./deploy.sh logs langfuse-web       # 查看 web 服务日志
./deploy.sh logs langfuse-worker    # 查看 worker 服务日志

# 清理资源
./deploy.sh cleanup

# 显示帮助
./deploy.sh help
```

## 🔧 环境变量配置

### 重要配置项

在 `.env` 文件中，以下配置项需要特别注意：

#### 数据库配置
```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres

# ClickHouse
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_PASSWORD=clickhouse

# Redis
REDIS_AUTH=myredissecret
```

### 生成安全密钥

```bash
# 生成 NextAuth 密钥
openssl rand -base64 32

# 生成加密密钥
openssl rand -hex 32
```

## 🌐 服务访问

部署完成后，可以通过以下地址访问服务：

| 服务 | 地址 | 说明 |
|------|------|------|
| Langfuse Web | http://localhost:3000 | 主应用界面 |
| MinIO 控制台 | http://localhost:9091 | 对象存储管理 |
| ClickHouse | http://localhost:8123 | 分析数据库 |
| Redis | localhost:6379 | 缓存服务 |
| PostgreSQL | localhost:5432 | 主数据库 |

### 默认凭据

| 服务 | 用户名 | 密码 |
|------|--------|------|
| MinIO | minio | miniosecret |
| PostgreSQL | postgres | postgres |
| ClickHouse | clickhouse | clickhouse |

## 📊 监控和日志

### 查看服务状态
```bash
./deploy.sh status
```

### 查看日志
```bash
# 查看所有服务日志
./deploy.sh logs

# 查看特定服务日志
./deploy.sh logs langfuse-web
./deploy.sh logs langfuse-worker
```

### 实时监控
```bash
# 使用 docker-compose 查看实时日志
docker-compose -f docker-compose.build.yml logs -f

# 查看特定服务实时日志
docker-compose -f docker-compose.build.yml logs -f langfuse-web
```

## 🔄 更新和维护

### 更新服务
```bash
# 停止服务
./deploy.sh stop

# 拉取最新代码（如果需要）
git pull

# 重新构建镜像
./deploy.sh build

# 启动服务
./deploy.sh start
```

### 备份数据
```bash
# 备份 PostgreSQL 数据
docker-compose -f docker-compose.build.yml exec postgres pg_dump -U postgres postgres > backup.sql

# 备份 ClickHouse 数据
docker-compose -f docker-compose.build.yml exec clickhouse clickhouse-client --query "BACKUP DATABASE default TO Disk('backups', 'backup')"
```

### 清理资源
```bash
# 清理所有容器、网络和卷
./deploy.sh cleanup
```

## 🐛 故障排除

### 常见问题

1. **端口冲突**
   - 检查端口 3000, 5432, 6379, 8123, 9090, 9091 是否被占用
   - 修改 docker-compose.build.yml 中的端口映射

2. **内存不足**
   - 确保系统有足够内存（建议 4GB+）
   - 调整 Docker 内存限制

3. **服务启动失败**
   - 查看日志：`./deploy.sh logs`
   - 检查环境变量配置
   - 确保所有依赖服务正常运行

4. **数据库连接失败**
   - 检查数据库服务是否正常启动
   - 验证连接字符串配置
   - 查看数据库日志

### 日志分析

```bash
# 查看详细错误日志
docker-compose -f docker-compose.build.yml logs --tail=100 langfuse-web

# 查看系统资源使用情况
docker stats

# 查看容器状态
docker-compose -f docker-compose.build.yml ps
```

## 📦 镜像导出和客户部署

### 导出镜像给客户

#### 1. 构建生产镜像

```bash
# 构建所有镜像
./deploy.sh build
```

#### 2. 导出镜像文件

```bash
# 使用镜像导出脚本
./export-images.sh

# 或指定版本
./export-images.sh v1.4.0

# 导出后清理临时文件
./export-images.sh v1.4.0 --cleanup
```

#### 3. 创建客户部署包

导出脚本会自动创建包含以下文件的部署包：
- `langfuse-web-*.tar.gz` - Web 服务镜像
- `langfuse-worker-*.tar.gz` - Worker 服务镜像  
- `langfuse-complete-*.tar.gz` - 完整镜像包（包含所有依赖）
- `docker-compose.yml` - 生产环境配置
- `deploy.sh` - 部署管理脚本
- `env.template` - 环境变量模板
- `CLIENT_DEPLOYMENT.md` - 客户部署指南
- `README.md` - 快速开始说明


### 生产环境安全配置

客户在生产环境中部署时，请确保：

1. **修改所有默认密码**：
   ```bash
   # 在 .env 文件中修改
   NEXTAUTH_SECRET=your-production-secret
   ENCRYPTION_KEY=your-production-encryption-key
   SALT=your-production-salt
   POSTGRES_PASSWORD=your-secure-postgres-password
   CLICKHOUSE_PASSWORD=your-secure-clickhouse-password
   REDIS_AUTH=your-secure-redis-password
   ```

2. **配置防火墙规则**：
   ```bash
   # 只开放必要端口
   sudo ufw allow 3000/tcp  # Langfuse Web
   sudo ufw allow 9090/tcp  # MinIO API
   sudo ufw allow 9091/tcp  # MinIO Console
   sudo ufw enable
   ```

3. **设置 SSL/TLS 证书**：
   使用 Nginx 反向代理配置 HTTPS

4. **配置监控和备份**：
   参考 `CLIENT_DEPLOYMENT.md` 中的监控和备份配置

## 📚 更多信息

- [Langfuse 官方文档](https://langfuse.com/docs)
- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [客户部署指南](CLIENT_DEPLOYMENT.md) - 详细的客户部署说明

## 🆘 获取帮助

如果遇到问题，可以：

1. 查看日志文件
2. 检查环境变量配置
3. 参考故障排除部分
4. 查看 Langfuse 官方文档
5. 查看客户部署指南
6. 在 GitHub 上提交 Issue
