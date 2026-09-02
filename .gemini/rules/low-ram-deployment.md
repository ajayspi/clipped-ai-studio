---
name: low-ram-deployment
description: Rule for deploying Next.js apps to low-RAM environments like Oracle Cloud Free Tier.
---

# Deployments on Oracle Micro-VMs

**Trigger**: When deploying Next.js applications to Oracle Cloud Free Tier or 1GB RAM micro-VMs.

**Behavior**: 
- Do not run `npm install` or `next build` natively on the VM unless strict `NODE_OPTIONS=--max-old-space-size=...` and swap files are confirmed. 
- Prefer compiling the `.next` production bundle locally, compressing it to `.tar.gz`, and deploying via `scp` for maximum stability to avoid dropped SSH connections and OOM crashes.
