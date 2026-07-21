# Production deployment status

Verified on 2026-07-21 on the single-node K3s VM.

- K3s node `uelailab`: Ready.
- Traefik, CoreDNS, metrics-server and local-path storage: Running.
- K9s: v0.51.0 installed at `~/.local/bin/k9s` with a verified release checksum.
- Workloads: User Web, Admin Web and API each run one replica in namespace `velura`.
- Images: immutable tag `prod-20260721-1`, distributed through a Docker registry bound only to `127.0.0.1:5000`.
- Supabase: Auth, Data API and direct PostgreSQL connectivity verified against the new project. No migrations were rerun.
- Public routes:
  - `https://velura.royalai.dev`
  - `https://admin.royalai.dev`
  - API under `https://velura.royalai.dev/api`
- Cloudflare connectors run as Kubernetes Deployments. Tunnel tokens are Kubernetes Secrets and are not stored in Git.

The existing remotely managed tunnels still target HTTPS localhost ports 3001 and 5174. Each connector Pod therefore includes a small TLS Nginx sidecar that forwards the old origin port to Traefik while preserving the public Host header. If the Cloudflare Dashboard origins are later changed to `http://traefik.kube-system.svc.cluster.local:80`, the compatibility sidecars and their TLS Secret can be removed.

Because `api-velura.royalai.dev` has no DNS route, frontend builds use the path-based API endpoint on the user domain. The Ingress sends `/api` and `/uploads` to the API service.

## Operations

```bash
export KUBECONFIG="$HOME/.kube/config"
kubectl get all,ingress -n velura
k9s -n velura
bash scripts/verify-k3s.sh
```

Never commit `env`, `.env`, kubeconfig, tunnel tokens, database credentials or server-side API keys. Rotate the Cloudflare tunnel tokens and application credentials if they have been shared outside the deployment channel.
