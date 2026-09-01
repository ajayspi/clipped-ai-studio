---
description: Critical deployment instructions for the Oracle VM
trigger: always_on
---

# Oracle VM Deployment Rules

When deploying the Clipped project to the Oracle VM, follow these rules strictly:
1. **Never use Docker** to build Next.js. The Oracle VM has a strict 1GB RAM limit and Docker builds will crash or hang indefinitely with an Out Of Memory (OOM) error or swap thrashing.
2. **Always build locally** on the host machine (`npm run build`).
3. **Deploy the `.next` folder** by SCPing the zip directly to the server, then running `pm2 restart clipped-web` (or equivalent PM2 command) to serve it natively without Docker.

## Deployment Pre-flight Checklist

1. **Environment Variables Check:**
   Before running `npx next build` locally, you MUST ensure that your local `.env.local` contains the real, live production keys (especially `NEXT_PUBLIC_` variables like Supabase URLs). Next.js statically bakes these into the client bundles at build time. If you build with dummy keys, the deployed frontend will fail to fetch data.

2. **Zip Script Safety:**
   When writing custom Python scripts to zip the deployment bundle locally before SCPing, you MUST explicitly exclude `.zip` files from the os.walk loop. Failure to do so will result in an infinite recursive zip bomb that crashes the disk.
   Example safe condition: `if file.endswith('.zip'): continue`
