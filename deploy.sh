#!/bin/bash

# Langfuse Docker 部署脚本
# 用于构建和部署 web 和 worker 服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose V2 (docker compose)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        log_info "使用 Docker Compose V2"
    # 检查 Docker Compose V1 (docker-compose)
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        log_info "使用 Docker Compose V1"
    else
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，正在创建模板文件..."
        create_env_template
        log_warning "请编辑 .env 文件，配置必要的环境变量后重新运行脚本"
        exit 1
    fi
    log_success "环境变量文件检查通过"
    
    # 加载 .env 文件中的环境变量
    log_info "加载 .env 文件中的环境变量..."
    
    # 使用更安全的方式加载 .env 文件
    while IFS= read -r line || [[ -n "$line" ]]; do
        # 跳过空行和注释行
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        # 检查是否是有效的环境变量格式 (变量名=值)
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*=.*$ ]]; then
            export "$line"
        fi
    done < .env
    
    # 调试信息：检查 Harbor 环境变量
    log_info "Harbor 用户名: ${HARBOR_USERNAME:-未设置}"
    log_info "Harbor 密码: ${HARBOR_PASSWORD:+已设置}"
    
    log_success "环境变量加载完成"
}

# 创建环境变量模板
create_env_template() {
    cat > .env << 'EOF'
# Langfuse 部署环境变量配置

# 镜像标签
LANGFUSE_WEB_IMAGE=powerrag-langfuse-web:release-1.3.0
LANGFUSE_WORKER_IMAGE=powerrag-langfuse-worker:release-1.3.0

# Harbor 仓库配置
HARBOR_USERNAME=your_harbor_username
HARBOR_PASSWORD=your_harbor_password
LANGFUSE_WEB_TAG=release-1.3.0
LANGFUSE_WORKER_TAG=release-1.3.0

# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/postgres
POSTGRES_VERSION=latest

# ClickHouse 配置
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_MIGRATION_URL=clickhouse://clickhouse:9000
CLICKHOUSE_USER=clickhouse
CLICKHOUSE_PASSWORD=clickhouse

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_AUTH=myredissecret

# 安全配置 (请修改这些值)
NEXTAUTH_SECRET=mysecret
SALT=mysalt
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# 功能开关
TELEMETRY_ENABLED=true
LANGFUSE_ENABLE_EXPERIMENTAL_FEATURES=false

# 初始化配置 (可选)
LANGFUSE_INIT_ORG_ID=
LANGFUSE_INIT_ORG_NAME=
LANGFUSE_INIT_PROJECT_ID=
LANGFUSE_INIT_PROJECT_NAME=
LANGFUSE_INIT_PROJECT_PUBLIC_KEY=
LANGFUSE_INIT_PROJECT_SECRET_KEY=
LANGFUSE_INIT_USER_EMAIL=
LANGFUSE_INIT_USER_NAME=
LANGFUSE_INIT_USER_PASSWORD=
EOF
}

# 构建镜像
build_images() {
    local services=${1:-"all"}
    
    log_info "开始构建 Docker 镜像..."
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        # 构建 web 镜像
        log_info "构建 web 镜像..."
        $COMPOSE_CMD -f docker-compose.build.yml build langfuse-web
        
        # 构建 worker 镜像
        log_info "构建 worker 镜像..."
        $COMPOSE_CMD -f docker-compose.build.yml build langfuse-worker
        
        log_success "所有镜像构建完成"
    else
        # 处理多个服务
        local service_list=""
        for service in $services; do
            case $service in
                "web")
                    log_info "构建 web 镜像..."
                    $COMPOSE_CMD -f docker-compose.build.yml build langfuse-web
                    ;;
                "worker")
                    log_info "构建 worker 镜像..."
                    $COMPOSE_CMD -f docker-compose.build.yml build langfuse-worker
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        log_success "镜像构建完成: $services"
    fi
}

# 上传镜像到 Harbor 仓库
upload_to_harbor() {
    local services=${1:-"all"}
    local harbor_registry="harbor.oceanbase-dev.com"
    local harbor_project="powerrag"
    
    # 检查 Harbor 配置
    if [ -z "$HARBOR_USERNAME" ] || [ -z "$HARBOR_PASSWORD" ]; then
        log_error "Harbor 用户名或密码未设置"
        log_info "请设置环境变量 HARBOR_USERNAME 和 HARBOR_PASSWORD"
        log_info "或在 .env 文件中配置这些变量"
        exit 1
    fi
    
    log_info "开始上传镜像到 Harbor 仓库: $harbor_registry/$harbor_project"
    
    # 登录 Harbor
    log_info "登录 Harbor 仓库..."
    echo "$HARBOR_PASSWORD" | docker login $harbor_registry -u "$HARBOR_USERNAME" --password-stdin
    if [ $? -ne 0 ]; then
        log_error "Harbor 登录失败"
        exit 1
    fi
    log_success "Harbor 登录成功"
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        # 上传 web 镜像
        upload_web_image "$harbor_registry" "$harbor_project"
        
        # 上传 worker 镜像
        upload_worker_image "$harbor_registry" "$harbor_project"
        
        log_success "所有镜像上传完成"
    else
        # 处理多个服务
        for service in $services; do
            case $service in
                "web")
                    upload_web_image "$harbor_registry" "$harbor_project"
                    ;;
                "worker")
                    upload_worker_image "$harbor_registry" "$harbor_project"
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        log_success "镜像上传完成: $services"
    fi
}

# 上传 Web 镜像
upload_web_image() {
    local harbor_registry="$1"
    local harbor_project="$2"
    local local_image="${LANGFUSE_WEB_IMAGE:-powerrag-langfuse-web:release-1.3.0}"
    local harbor_image="$harbor_registry/$harbor_project/langfuse-web:${LANGFUSE_WEB_TAG:-release-1.3.0}"
    
    log_info "上传 Web 镜像: $local_image -> $harbor_image"
    
    # 标记镜像
    docker tag "$local_image" "$harbor_image"
    if [ $? -ne 0 ]; then
        log_error "标记 Web 镜像失败"
        exit 1
    fi
    
    # 推送镜像
    docker push "$harbor_image"
    if [ $? -ne 0 ]; then
        log_error "推送 Web 镜像失败"
        exit 1
    fi
    
    log_success "Web 镜像上传成功: $harbor_image"
}

# 上传 Worker 镜像
upload_worker_image() {
    local harbor_registry="$1"
    local harbor_project="$2"
    local local_image="${LANGFUSE_WORKER_IMAGE:-powerrag-langfuse-worker:release-1.3.0}"
    local harbor_image="$harbor_registry/$harbor_project/langfuse-worker:${LANGFUSE_WORKER_TAG:-release-1.3.0}"
    
    log_info "上传 Worker 镜像: $local_image -> $harbor_image"
    
    # 标记镜像
    docker tag "$local_image" "$harbor_image"
    if [ $? -ne 0 ]; then
        log_error "标记 Worker 镜像失败"
        exit 1
    fi
    
    # 推送镜像
    docker push "$harbor_image"
    if [ $? -ne 0 ]; then
        log_error "推送 Worker 镜像失败"
        exit 1
    fi
    
    log_success "Worker 镜像上传成功: $harbor_image"
}

# 从 Harbor 拉取镜像
pull_harbor_image() {
    local service="$1"
    local harbor_registry="harbor.oceanbase-dev.com"
    local harbor_project="powerrag"
    
    case $service in
        "web")
            local harbor_image="$harbor_registry/$harbor_project/langfuse-web:${LANGFUSE_WEB_TAG:-release-1.3.0}"
            local local_image="${LANGFUSE_WEB_IMAGE:-powerrag-langfuse-web:release-1.3.0}"
            ;;
        "worker")
            local harbor_image="$harbor_registry/$harbor_project/langfuse-worker:${LANGFUSE_WORKER_TAG:-release-1.3.0}"
            local local_image="${LANGFUSE_WORKER_IMAGE:-powerrag-langfuse-worker:release-1.3.0}"
            ;;
        *)
            log_error "无效的服务名称: $service"
            exit 1
            ;;
    esac
    
    log_info "从 Harbor 拉取镜像: $harbor_image"
    
    # 拉取镜像
    docker pull "$harbor_image"
    if [ $? -ne 0 ]; then
        log_error "拉取镜像失败: $harbor_image"
        exit 1
    fi
    
    # 标记为本地镜像
    docker tag "$harbor_image" "$local_image"
    if [ $? -ne 0 ]; then
        log_error "标记镜像失败: $harbor_image -> $local_image"
        exit 1
    fi
    
    log_success "镜像拉取成功: $harbor_image -> $local_image"
}

# 启动服务
start_services() {
    local services=${1:-"all"}
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        log_info "启动所有 Langfuse 应用服务..."
        # 使用 build.yml 文件启动应用服务，确保使用本地构建的镜像
        $COMPOSE_CMD -f docker-compose.build.yml up -d langfuse-web langfuse-worker
        log_success "所有应用服务启动完成"
    elif [[ "$services" == "full" ]]; then
        log_info "启动完整的 Langfuse 服务（包括中间件）..."
        $COMPOSE_CMD -f docker-compose.build.yml up -d
        log_success "完整服务启动完成"
    else
        # 处理多个服务
        local service_list=""
        for service in $services; do
            case $service in
                "web")
                    service_list="$service_list langfuse-web"
                    ;;
                "worker")
                    service_list="$service_list langfuse-worker"
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        if [[ -n "$service_list" ]]; then
            log_info "启动服务: $services"
            # 使用 build.yml 文件启动服务，确保使用本地构建的镜像
            $COMPOSE_CMD -f docker-compose.build.yml up -d $service_list
            log_success "服务启动完成: $services"
        fi
    fi
    
    # 显示服务状态
    show_status
}

# 拉取镜像并启动服务
start_with_pull() {
    local service=${1:-"all"}
    
    log_info "开始从 Harbor 仓库拉取镜像并启动服务..."
    
    # 检查 Harbor 配置
    if [ -z "$HARBOR_USERNAME" ] || [ -z "$HARBOR_PASSWORD" ]; then
        log_error "Harbor 用户名或密码未设置"
        log_info "请设置环境变量 HARBOR_USERNAME 和 HARBOR_PASSWORD"
        log_info "或在 .env 文件中配置这些变量"
        exit 1
    fi
    
    # 登录 Harbor
    log_info "登录 Harbor 仓库..."
    echo "$HARBOR_PASSWORD" | docker login harbor.oceanbase-dev.com -u "$HARBOR_USERNAME" --password-stdin
    if [ $? -ne 0 ]; then
        log_error "Harbor 登录失败"
        exit 1
    fi
    log_success "Harbor 登录成功"
    
    # 拉取镜像
    case $service in
        "web")
            log_info "从 Harbor 拉取 Web 镜像..."
            pull_harbor_image "web"
            ;;
        "worker")
            log_info "从 Harbor 拉取 Worker 镜像..."
            pull_harbor_image "worker"
            ;;
        "all")
            log_info "从 Harbor 拉取所有应用镜像..."
            pull_harbor_image "web"
            pull_harbor_image "worker"
            ;;
        "full")
            log_info "从 Harbor 拉取完整服务镜像..."
            pull_harbor_image "web"
            pull_harbor_image "worker"
            ;;
        *)
            log_error "无效的服务名称: $service"
            log_info "支持的服务: web, worker, all, full"
            exit 1
            ;;
    esac
    
    log_success "镜像拉取完成"
    
    # 启动服务
    start_services "$service"
}

# 停止服务
stop_services() {
    local services=${1:-"all"}
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        log_info "停止所有 Langfuse 服务..."
        # 使用 build.yml 文件停止服务，确保与启动时使用相同的配置文件
        $COMPOSE_CMD -f docker-compose.build.yml down
        log_success "所有服务已停止"
    elif [[ "$services" == "full" ]]; then
        log_info "停止完整的 Langfuse 服务..."
        $COMPOSE_CMD -f docker-compose.build.yml down
        log_success "完整服务已停止"
    else
        # 处理多个服务
        local service_list=""
        for service in $services; do
            case $service in
                "web")
                    service_list="$service_list langfuse-web"
                    ;;
                "worker")
                    service_list="$service_list langfuse-worker"
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        if [[ -n "$service_list" ]]; then
            log_info "停止服务: $services"
            # 使用 build.yml 文件停止服务，确保与启动时使用相同的配置文件
            $COMPOSE_CMD -f docker-compose.build.yml stop $service_list
            log_success "服务已停止: $services"
        fi
    fi
}

# 重启服务
restart_services() {
    local services=${1:-"all"}
    log_info "重启 Langfuse 服务..."
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        log_info "强制重新创建所有应用服务以应用新的环境变量..."
        $COMPOSE_CMD -f docker-compose.build.yml up -d --force-recreate langfuse-web langfuse-worker
        log_success "所有服务重启完成"
    elif [[ "$services" == "full" ]]; then
        log_info "强制重新创建完整服务以应用新的环境变量..."
        $COMPOSE_CMD -f docker-compose.build.yml up -d --force-recreate
        log_success "完整服务重启完成"
    else
        # 处理多个服务
        local service_list=""
        for service in $services; do
            case $service in
                "web")
                    service_list="$service_list langfuse-web"
                    ;;
                "worker")
                    service_list="$service_list langfuse-worker"
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        if [[ -n "$service_list" ]]; then
            log_info "强制重新创建服务以应用新的环境变量: $services"
            $COMPOSE_CMD -f docker-compose.build.yml up -d --force-recreate $service_list
            log_success "服务重启完成: $services"
        fi
    fi
    
    # 显示服务状态
    show_status
}


# 重启服务并拉取最新镜像
restart_with_pull() {
    local services=${1:-"all"}
    log_info "重启服务并从 Harbor 仓库拉取最新镜像..."
    
    # 检查 Harbor 配置
    if [ -z "$HARBOR_USERNAME" ] || [ -z "$HARBOR_PASSWORD" ]; then
        log_error "Harbor 用户名或密码未设置"
        log_info "请设置环境变量 HARBOR_USERNAME 和 HARBOR_PASSWORD"
        log_info "或在 .env 文件中配置这些变量"
        exit 1
    fi
    
    # 登录 Harbor
    log_info "登录 Harbor 仓库..."
    echo "$HARBOR_PASSWORD" | docker login harbor.oceanbase-dev.com -u "$HARBOR_USERNAME" --password-stdin
    if [ $? -ne 0 ]; then
        log_error "Harbor 登录失败"
        exit 1
    fi
    log_success "Harbor 登录成功"
    
    # 处理多个服务参数
    if [[ "$services" == "all" ]]; then
        log_info "从 Harbor 拉取所有应用镜像..."
        pull_harbor_image "web"
        pull_harbor_image "worker"
        log_info "重启所有服务..."
        $COMPOSE_CMD -f docker-compose.build.yml up -d --force-recreate langfuse-web langfuse-worker
        log_success "所有服务重启完成"
    else
        # 处理多个服务
        local service_list=""
        for service in $services; do
            case $service in
                "web")
                    pull_harbor_image "web"
                    service_list="$service_list langfuse-web"
                    ;;
                "worker")
                    pull_harbor_image "worker"
                    service_list="$service_list langfuse-worker"
                    ;;
                *)
                    log_error "无效的服务名称: $service"
                    log_info "支持的服务: web, worker"
                    exit 1
                    ;;
            esac
        done
        
        if [[ -n "$service_list" ]]; then
            log_info "重启服务: $services"
            $COMPOSE_CMD -f docker-compose.build.yml up -d --force-recreate $service_list
            log_success "服务重启完成: $services"
        fi
    fi
    
    # 显示服务状态
    show_status
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    
    # 检查是否有应用服务在运行（使用 build.yml 文件）
    if $COMPOSE_CMD -f docker-compose.build.yml ps --services --filter "status=running" | grep -q "langfuse"; then
        $COMPOSE_CMD -f docker-compose.build.yml ps
        echo ""
        log_info "访问地址："
        echo "  Web 界面: http://localhost:3001"
        echo "  Worker API: http://localhost:3030"
        echo ""
        
        # 检查是否启动了完整服务（包括中间件）
        if $COMPOSE_CMD -f docker-compose.build.yml ps --services --filter "status=running" | grep -qE "(postgres|clickhouse|redis|minio)"; then
            log_info "完整服务已启动，包括中间件："
            echo "  MinIO 控制台: http://localhost:9091"
            echo "  ClickHouse: http://localhost:8123"
            echo "  Redis: localhost:6379"
            echo "  PostgreSQL: localhost:5432"
        else
            log_info "注意：此配置仅启动应用服务，不包含中间件（PostgreSQL、ClickHouse、Redis、MinIO）"
            echo "如需完整部署，请使用: $0 start full"
        fi
    else
        log_info "没有服务在运行"
    fi
}

# 查看日志
show_logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        $COMPOSE_CMD -f docker-compose.build.yml logs -f "$service"
    else
        $COMPOSE_CMD -f docker-compose.build.yml logs -f
    fi
}

# 清理资源
cleanup() {
    log_info "清理 Docker 资源..."
    $COMPOSE_CMD -f docker-compose.build.yml down -v
    docker system prune -f
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "Langfuse Docker 部署脚本"
    echo ""
    echo "用法: $0 <命令> [服务]"
    echo ""
    echo "命令:"
    echo "  build           构建 Docker 镜像 (web|worker|all)"
    echo "  upload          上传镜像到 Harbor 仓库 (web|worker|all)"
    echo "  start           启动服务 (web|worker|all)"
    echo "  start-with-pull 从 Harbor 拉取镜像并启动服务 (web|worker|all)"
    echo "  stop            停止服务 (web|worker|all)"
    echo "  restart         重启服务 (web|worker|all)"
    echo "  restart-with-pull 从 Harbor 拉取最新镜像并重启服务 (web|worker|all)"
    echo "  status          显示服务状态"
    echo "  logs            查看日志 (可选指定服务名)"
    echo "  cleanup         清理所有资源"
    echo "  help            显示此帮助信息"
    echo ""
    echo "服务参数:"
    echo "  web       仅启动/停止 Web 服务"
    echo "  worker    仅启动/停止 Worker 服务"
    echo "  all       启动/停止所有应用服务 (默认，不包含中间件)"
    echo "  full      启动/停止完整服务 (包含中间件)"
    echo ""
    echo "示例:"
    echo "  $0 build                    # 构建所有镜像"
    echo "  $0 build web                # 仅构建 Web 镜像"
    echo "  $0 build worker             # 仅构建 Worker 镜像"
    echo "  $0 upload                   # 上传所有镜像到 Harbor 仓库"
    echo "  $0 upload web               # 仅上传 Web 镜像到 Harbor 仓库"
    echo "  $0 upload worker            # 仅上传 Worker 镜像到 Harbor 仓库"
    echo "  $0 start                    # 启动所有应用服务"
    echo "  $0 start web                # 仅启动 Web 服务"
    echo "  $0 start worker             # 仅启动 Worker 服务"
    echo "  $0 start full               # 启动完整服务（包含中间件）"
    echo "  $0 start-with-pull          # 从 Harbor 拉取镜像并启动所有应用服务"
    echo "  $0 start-with-pull web       # 从 Harbor 拉取镜像并启动 Web 服务"
    echo "  $0 start-with-pull worker    # 从 Harbor 拉取镜像并启动 Worker 服务"
    echo "  $0 start-with-pull full     # 从 Harbor 拉取镜像并启动完整服务"
    echo "  $0 stop web                 # 仅停止 Web 服务"
    echo "  $0 stop web worker          # 停止 Web 和 Worker 服务"
    echo "  $0 restart worker           # 重启 Worker 服务"
    echo "  $0 restart web worker       # 重启 Web 和 Worker 服务"
    echo "  $0 restart-with-pull web worker  # 从 Harbor 拉取最新镜像并重启服务"
    echo "  $0 logs langfuse-web        # 查看 web 服务日志"
    echo "  $0 logs                     # 查看所有服务日志"
    echo ""
    echo "Harbor 配置:"
    echo "  请确保在 .env 文件中配置以下变量："
    echo "  HARBOR_USERNAME=your_harbor_username"
    echo "  HARBOR_PASSWORD=your_harbor_password"
    echo "  LANGFUSE_WEB_TAG=release-1.3.0"
    echo "  LANGFUSE_WORKER_TAG=release-1.3.0"
}

# 主函数
main() {
    local command=${1:-"help"}
    
    case $command in
        "build")
            check_docker
            check_env_file
            build_images "$2"
            ;;
        "upload")
            check_docker
            check_env_file
            upload_to_harbor "$2"
            ;;
        "start")
            check_docker
            check_env_file
            start_services "$2"
            ;;
        "start-with-pull")
            check_docker
            check_env_file
            start_with_pull "$2"
            ;;
        "stop")
            check_docker
            stop_services "$2"
            ;;
        "restart")
            check_docker
            check_env_file
            restart_services "$2"
            ;;
        "restart-with-pull")
            check_docker
            check_env_file
            restart_with_pull "$2"
            ;;
        "status")
            check_docker
            show_status
            ;;
        "logs")
            check_docker
            show_logs "$2"
            ;;
        "cleanup")
            check_docker
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 执行主函数
main "$@"
