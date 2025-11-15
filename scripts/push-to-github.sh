#!/bin/bash
# 将本地分支压缩后推送到 GitHub（保留原分支的完整 commit 历史用于 origin）
# 使用方法: 
#   ./scripts/push-to-github.sh [commit-message]
#   例如: 
#     ./scripts/push-to-github.sh "feat: update readme"
#     ./scripts/push-to-github.sh                        # 交互式输入
#
# 说明:
#   - origin 远程仓库: 保留所有 commit 历史（原分支不变）
#   - github 远程仓库: 压缩为一条英文提交记录

set -e

# 自动获取当前分支名
BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
if [ -z "$BRANCH" ]; then
    echo "❌ 错误: 无法获取当前分支名"
    exit 1
fi

GITHUB_REMOTE="github"
BASE_COMMIT="9aa4c11c56538dacfc9edee87393a98304025d59"

# 检查 github 远程仓库是否存在
if ! git remote | grep -q "^${GITHUB_REMOTE}$"; then
    echo "❌ 错误: 远程仓库 '${GITHUB_REMOTE}' 不存在"
    echo "💡 提示: 请先添加 github 远程仓库，例如:"
    echo "   git remote add github <repository-url>"
    exit 1
fi

# 获取提交信息参数
COMMIT_MSG_PARAM="$1"

echo "📦 准备压缩提交并推送到 GitHub..."
echo "📍 当前分支: $BRANCH"
echo "📍 目标远程: $GITHUB_REMOTE ($(git remote get-url $GITHUB_REMOTE))"
echo "💡 注意: 原分支的 commit 历史将保持不变，可用于推送到 origin"

# 检查是否有未提交的更改
if ! git diff-index --quiet HEAD --; then
    echo "❌ 错误: 存在未提交的更改，请先提交或暂存"
    exit 1
fi

# 创建临时分支
TEMP_BRANCH="${BRANCH}-squash-$(date +%s)"
echo "🔀 创建临时分支: $TEMP_BRANCH"
git checkout -b "$TEMP_BRANCH"

# 重置到基础提交，保留所有更改
echo "🔄 压缩提交..."
git reset --soft "$BASE_COMMIT"

# 获取提交信息
if [ -n "$COMMIT_MSG_PARAM" ]; then
    # 使用参数提供的提交信息
    COMMIT_MSG="$COMMIT_MSG_PARAM"
    echo "📝 使用提供的提交信息: $COMMIT_MSG"
else
    # 提示用户输入提交信息（必须为英文）
    echo ""
    echo "📝 请输入提交信息（必须为英文，遵循 Conventional Commits 格式）:"
    echo "   例如: feat: update PowerRAG Langfuse v3.103.0"
    read -p "Commit message: " COMMIT_MSG
    
    # 验证提交信息不为空
    if [ -z "$COMMIT_MSG" ]; then
        echo "❌ 错误: 提交信息不能为空"
        # 恢复原分支状态
        git checkout "$BRANCH"
        git branch -D "$TEMP_BRANCH" 2>/dev/null || true
        exit 1
    fi
fi

# 创建新的提交
echo "💾 创建压缩提交..."
git commit -m "$COMMIT_MSG"

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
git push "$GITHUB_REMOTE" "$TEMP_BRANCH:$BRANCH" --force

# 切换回原分支
echo "↩️  切换回原分支..."
git checkout "$BRANCH"

# 删除临时分支
echo "🧹 清理临时分支..."
git branch -D "$TEMP_BRANCH"

echo "✅ 完成！"
echo "   - GitHub ($GITHUB_REMOTE): 已推送压缩后的单条提交"
echo "   - 原分支 ($BRANCH): 保持完整 commit 历史，可推送到 origin"

