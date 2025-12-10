#/bin/zsh

cd /workspaces/app

# Install Playwright browsers
pnpm install \
& pnpm exec playwright install-deps \
& pnpm exec playwright install chromium

curl -L https://daisyui.com/llms.txt --create-dirs -o .github/instructions/daisyui.instructions.md

# post-create-custom.sh ファイルが存在する場合、それを実行
if [ -f ".devcontainer/post-create-custom.sh" ]; then
  echo "post-create-custom.sh を実行します..."
  bash .devcontainer/post-create-custom.sh
else
  echo "post-create-custom.sh が見つかりません"
fi
