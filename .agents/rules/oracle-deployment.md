---
description: Critical deployment instructions for the Oracle VM
trigger: always_on
---

# Oracle VM Deployment Rules

When deploying the Clipped project to the Oracle VM, follow these rules strictly:
1. **Never use Docker** to build Next.js. The Oracle VM has a strict 1GB RAM limit and Docker builds will crash or hang indefinitely with an Out Of Memory (OOM) error or swap thrashing.
2. **Always build locally** on the host machine (`npm run build`).
3. **Deploy the `.next` folder** by SCPing the zip directly to the server, then running `pm2 restart clipped-web` (or equivalent PM2 command) to serve it natively without Docker.
