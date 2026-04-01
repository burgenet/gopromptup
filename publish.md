# GoPromptUp — Deploy to k3s

## 1. Build & push images

```bash
# Backend
docker build -t sillygooseia/gopromptup-backend:1.0.0 ./backend
docker push sillygooseia/gopromptup-backend:1.0.0

# Frontend
docker build -t sillygooseia/gopromptup-frontend:1.0.0 ./frontend
docker push sillygooseia/gopromptup-frontend:1.0.0
```

## 2. Apply manifests

```bash
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## 3. DNS

Point `gopromptup.com` and `www.gopromptup.com` A records to the cluster's external IP.
cert-manager will issue the TLS cert automatically via letsencrypt-prod.

## 4. Verify

```bash
kubectl get pods -n infra -l app=gopromptup-backend
kubectl get pods -n infra -l app=gopromptup-frontend
kubectl get ingress -n infra gopromptup-ingress
```

## Updating

Bump the image tag, rebuild/push, then:

```bash
kubectl set image deployment/gopromptup-backend backend=sillygooseia/gopromptup-backend:1.0.1 -n infra
kubectl set image deployment/gopromptup-frontend frontend=sillygooseia/gopromptup-frontend:1.0.1 -n infra
```

## Notes

- Redis uses the shared cluster `sillygooseia-redis-master`. All gopromptup keys are prefixed `gopromptup:`.
- The frontend nginx container proxies `/api/*` to the `gopromptup-backend` service — no separate subdomain needed.
- www redirects to apex via Traefik Middleware.
