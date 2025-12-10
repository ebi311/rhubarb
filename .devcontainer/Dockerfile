FROM node:24-bookworm-slim

# Install pnpm and configure per-user store/home
RUN npm install -g pnpm@latest --no-audit --no-fund

WORKDIR /workspaces

# Install dependencies (as root)
RUN apt-get update && apt-get install -y --no-install-recommends \
			zsh git curl wget ca-certificates fontconfig unzip locales sudo \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install -g @github/copilot

# Allow passwordless sudo for the 'node' user by installing sudo (above) and
# creating a sudoers.d entry. We create the file as root then switch to node user
# later in the Dockerfile; using a heredoc with tee to write file as root.
# RUN printf '%s\n' "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-node-nopasswd \
#     && chmod 0440 /etc/sudoers.d/99-node-nopasswd

# Use existing 'node' user; set default shell to zsh
RUN usermod -s /bin/zsh node

RUN mkdir -p /workspaces/app/node_modules && \
		chown -R node:node /workspaces

# Allow passwordless sudo for the 'node' user
RUN printf '%s\n' "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-node-nopasswd \
	&& chmod 0440 /etc/sudoers.d/99-node-nopasswd

# Switch to node user for subsequent operations
USER node

# Install zsh, oh-my-zsh, powerlevel10k, plugins for devcontainer user
RUN git clone --depth=1 https://github.com/ohmyzsh/ohmyzsh.git ~/.oh-my-zsh \
	&& git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k \
	&& git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions.git ~/.oh-my-zsh/custom/plugins/zsh-autosuggestions \
	&& git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting.git ~/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \
	\
	# base .zshrc -> enable powerlevel10k and useful plugins
	&& cp ~/.oh-my-zsh/templates/zshrc.zsh-template ~/.zshrc \
	&& sed -i 's|ZSH_THEME=".*"|ZSH_THEME="powerlevel10k/powerlevel10k"|' ~/.zshrc \
	&& sed -i 's|plugins=(git)|plugins=(git zsh-autosuggestions zsh-syntax-highlighting)|' ~/.zshrc \
	&& echo "\nbindkey -v" >> ~/.zshrc


# Optionally copy Powerlevel10k config from repository into image
COPY ./.p10k.zsh* /home/node/

# Ensure .zshrc loads p10k when present
RUN echo '\n# Load Powerlevel10k config when present\n[[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh' >> ~/.zshrc

# Use zsh as default shell for subsequent RUN/CMD
SHELL ["/bin/zsh", "-c"]

# Persist zsh history inside the workspace so history survives rebuilds.
# Create a history file in the repository .devcontainer directory and
# configure ~/.zshrc to use it with history-sharing options.
RUN mkdir -p /workspaces/app/.devcontainer \
	&& touch /workspaces/app/.devcontainer/.zsh_history \
	&& chmod 600 /workspaces/app/.devcontainer/.zsh_history \
	&& chown -R node:node /workspaces/app/.devcontainer || true

RUN echo '\n# Use workspace persistent zsh history\nexport HISTFILE=/workspaces/app/.devcontainer/.zsh_history\nexport HISTSIZE=10000\nexport SAVEHIST=10000\nsetopt append_history share_history inc_append_history hist_ignore_all_dups\n' >> ~/.zshrc

CMD ["zsh"]