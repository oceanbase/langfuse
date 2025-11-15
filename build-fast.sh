#!/bin/bash

# 快速构建脚本 - 使用 BuildKit 和优化设置
set -e

echo "[INFO] 启用 Docker BuildKit 进行快速构建..."

# 启用 BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 设置构建参数
export BUILDKIT_PROGRESS=plain

# 清理旧的构建缓存（可选）
if [ "$1" = "--clean" ]; then
    echo "[INFO] 清理构建缓存..."
    docker builder prune -f
fi

# 构建镜像
echo "[INFO] 开始快速构建..."
docker-compose build --parallel --no-cache=false

echo "[SUCCESS] 快速构建完成！"
