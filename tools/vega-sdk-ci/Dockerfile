# Verification image: proves the Vega SDK installs non-interactively and can build the app.
# Mirrors Amazon's official CI Dockerfile, adapted for this repo (Node 20 + Yarn 4.5.0).
# Used for LOCAL verification only — the GitHub Action installs the SDK directly on the runner.
FROM --platform=linux/amd64 ubuntu:22.04

SHELL ["/bin/bash", "-c"]
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y curl tar jq ca-certificates git --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Node 20 + corepack (for Yarn 4.5.0)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs --no-install-recommends && \
    corepack enable && \
    rm -rf /var/lib/apt/lists/*

# Vega SDK — non-interactive, skip the virtual device (we only need the builder)
ENV NONINTERACTIVE=true
ENV SKIP_VVD_INSTALL=true
ENV VEGA_SDK_VERSION=0.22.6759
RUN curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash

ENV PATH="/root/vega/bin:${PATH}"

# Gate 1: SDK installed and on PATH
RUN vega -v && node -v && npm -v

ENTRYPOINT ["/bin/bash", "-c"]
