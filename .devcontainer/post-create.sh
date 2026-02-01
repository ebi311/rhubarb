#/bin/zsh

cd /workspaces/app

# Install Playwright browsers
pnpm install \
& pnpm exec playwright install-deps \
& pnpm exec playwright install chromium

curl -L https://daisyui.com/llms.txt --create-dirs -o .github/instructions/daisyui.instructions.md

# ingsll gh
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
	&& sudo mkdir -p -m 755 /etc/apt/keyrings \
	&& out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg \
	&& cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
	&& sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
	&& sudo mkdir -p -m 755 /etc/apt/sources.list.d \
	&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
	&& sudo apt update \
	&& sudo apt install gh -y

# python　をインストール ai agent が使いたがる
sudo apt update
sudo apt install python3 -y
sudo apt install python3-pip -y

sudo pnpm exec playwright install-deps  

# .zshrc に環境変数を追加
echo 'export GH_PAGER=""' >> ~/.zshrc
echo 'export PAGER=""' >> ~/.zshrc

# post-create-custom.sh ファイルが存在する場合、それを実行
if [ -f ".devcontainer/post-create-custom.sh" ]; then
  echo "post-create-custom.sh を実行します..."
  bash .devcontainer/post-create-custom.sh
else
  echo "post-create-custom.sh が見つかりません"
fi
