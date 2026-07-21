# Velura on K3s

The deployment contains three single-replica workloads in namespace `velura`: two Nginx static sites and the Node.js API. Supabase remains external.

## Prerequisites

- Ubuntu VM reachable at Tailscale address `100.77.219.64`.
- Node.js 22+, Docker, curl and sudo access.
- `env` must remain outside Git and contain the runtime values. Never expose a Supabase secret key through a `VITE_*` variable.
- A new PostgreSQL pooler/direct URI is required before running migrations. API keys and a JWKS URL are not PostgreSQL connection strings.

## Lab checkpoint

```bash
bash scripts/k3s-install.sh
bash scripts/build-k3s-images.sh lab-v1
bash scripts/deploy-k3s.sh lab
bash scripts/verify-k3s.sh
```

For manual checks, use three terminals:

```bash
kubectl port-forward service/velura-user-web 3001:80 -n velura
kubectl port-forward service/velura-admin-web 5174:80 -n velura
kubectl port-forward service/velura-api 8787:8787 -n velura
```

Then verify `http://127.0.0.1:3001`, `http://127.0.0.1:5174` and `http://127.0.0.1:8787/health`.

## Production ingress and Cloudflare

After the lab passes:

```bash
bash scripts/deploy-k3s.sh production
curl -fsS -H 'Host: velura.royalai.dev' http://127.0.0.1/healthz
curl -fsS -H 'Host: admin.royalai.dev' http://127.0.0.1/healthz
curl -fsS -H 'Host: api-velura.royalai.dev' http://127.0.0.1/health
```

Configure all three Cloudflare Tunnel public hostnames with service `http://localhost:80`; Traefik routes by hostname. Do not point Cloudflare at Vite ports or use HTTPS for the plain HTTP local origin.

Supabase Auth URL Configuration must include:

- Site URL: `https://velura.royalai.dev`
- `https://velura.royalai.dev/src/pages/auth/auth-callback.html`
- `https://admin.royalai.dev/pages/admin/auth-callback.html`
- `https://admin.royalai.dev/pages/admin/change-password.html`

For a client machine, copy `/etc/rancher/k3s/k3s.yaml`, protect it with mode 600, and replace `https://127.0.0.1:6443` with `https://100.77.219.64:6443`. Do not commit this admin credential. Install K9s on the client and verify `kubectl get nodes` before starting `k9s`.

## Trainer demonstrations

```bash
kubectl delete pod -n velura -l app=velura-user-web
kubectl get pods -n velura -w
kubectl scale deployment/velura-user-web --replicas=3 -n velura
kubectl rollout history deployment/velura-user-web -n velura
bash scripts/rollback-k3s.sh
```

Reapply the declared overlay after a scale demo to restore one replica.
