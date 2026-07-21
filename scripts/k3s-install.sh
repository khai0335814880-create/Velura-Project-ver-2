#!/usr/bin/env bash
set -euo pipefail

if command -v k3s >/dev/null 2>&1; then
  echo "K3s is already installed."
else
  curl -sfL https://get.k3s.io | sudo sh -
fi

mkdir -p "${HOME}/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "${HOME}/.kube/config"
sudo chown "$(id -u):$(id -g)" "${HOME}/.kube/config"
chmod 600 "${HOME}/.kube/config"
kubectl get nodes -o wide
kubectl get pods -A
kubectl get storageclass
