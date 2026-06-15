set -euo pipefail
echo "=== copying repo (excl node_modules/.git/streamyfin/build) ==="
mkdir -p /app
cd /src
tar --exclude='node_modules' --exclude='.git' --exclude='streamyfin' \
    --exclude='apps/vega/build' --exclude='apps/vega/buildinfo.json' \
    -cf - . | (cd /app && tar xf -)
cd /app
echo "=== yarn version ==="
corepack yarn -v
echo "=== yarn install ==="
corepack yarn install --immutable
echo "=== build:vega (Release) ==="
corepack yarn build:vega
echo "=== resulting vpkgs ==="
find apps/vega/build -name '*.vpkg' -print
echo "=== DONE ==="
