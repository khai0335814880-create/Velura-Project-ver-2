#!/usr/bin/env bash
set -euo pipefail

for deployment in velura-user-web velura-admin-web velura-api; do
  kubectl rollout undo "deployment/${deployment}" -n velura
  kubectl rollout status "deployment/${deployment}" -n velura --timeout=180s
done
