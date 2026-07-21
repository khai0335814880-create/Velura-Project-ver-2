#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${VELURA_ENV_FILE:-${repo_root}/env}"
overlay="${1:-lab}"

[[ "${overlay}" == "lab" || "${overlay}" == "production" ]] || { echo "Usage: $0 [lab|production]" >&2; exit 2; }
[[ -f "${env_file}" ]] || { echo "Missing env file: ${env_file}" >&2; exit 1; }

kubectl apply -f "${repo_root}/infra/k8s/base/namespace.yaml"
kubectl create secret generic velura-api-secrets \
  --namespace velura \
  --from-env-file="${env_file}" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply --dry-run=client -k "${repo_root}/infra/k8s/overlays/${overlay}" >/dev/null
kubectl apply -k "${repo_root}/infra/k8s/overlays/${overlay}"

for deployment in velura-user-web velura-admin-web velura-api; do
  kubectl rollout status "deployment/${deployment}" -n velura --timeout=180s
done
