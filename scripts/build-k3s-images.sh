#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${VELURA_ENV_FILE:-${repo_root}/env}"
tag="${1:-lab-v1}"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
[[ -f "${env_file}" ]] || { echo "Missing env file: ${env_file}" >&2; exit 1; }

env_value() { sed -n "s/^$1=//p" "${env_file}" | tail -n 1; }
api_origin="$(env_value VITE_API_BASE_URL)"
supabase_url="$(env_value VITE_SUPABASE_URL)"
supabase_key="$(env_value VITE_SUPABASE_ANON_KEY)"

build_web() {
  local app="$1"
  DOCKER_BUILDKIT=1 docker build \
    --build-arg "VITE_API_BASE_URL=${api_origin}" \
    --build-arg "VITE_SUPABASE_URL=${supabase_url}" \
    --build-arg "VITE_SUPABASE_ANON_KEY=${supabase_key}" \
    -f "apps/${app}/Dockerfile" -t "velura-${app}:${tag}" "${repo_root}"
}

cd "${repo_root}"
build_web user-web
build_web admin-web
DOCKER_BUILDKIT=1 docker build -f apps/api/Dockerfile -t "velura-api:${tag}" .

archive="$(mktemp --suffix=.tar)"
trap 'rm -f "${archive}"' EXIT
docker save "velura-user-web:${tag}" "velura-admin-web:${tag}" "velura-api:${tag}" -o "${archive}"
sudo k3s ctr images import "${archive}"
sudo k3s ctr images list | grep 'velura-'
