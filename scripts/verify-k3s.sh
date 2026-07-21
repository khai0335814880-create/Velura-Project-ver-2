#!/usr/bin/env bash
set -euo pipefail

kubectl get nodes -o wide
kubectl get pods -A
kubectl get all -n velura
kubectl get events -n velura --sort-by=.lastTimestamp | tail -n 30

api_pod="$(kubectl get pod -n velura -l app=velura-api -o jsonpath='{.items[0].metadata.name}')"
user_pod="$(kubectl get pod -n velura -l app=velura-user-web -o jsonpath='{.items[0].metadata.name}')"
admin_pod="$(kubectl get pod -n velura -l app=velura-admin-web -o jsonpath='{.items[0].metadata.name}')"
kubectl exec -n velura "${api_pod}" -- wget -qO- http://127.0.0.1:8787/health
kubectl exec -n velura "${user_pod}" -- wget -qO- http://127.0.0.1/healthz
kubectl exec -n velura "${admin_pod}" -- wget -qO- http://127.0.0.1/healthz
