module.exports = {
  apps: [
    {
      name: 'omniroute-gateway',
      script: 'npm',
      args: 'run start',
      cwd: './omniroute-server',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 20128
      }
    },
    {
      name: 'clipped-web',
      script: 'npm',
      args: 'run start',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'render-worker',
      script: 'scripts/render-worker.ts',
      // Bun natively executes TypeScript — no tsx transpilation layer, ~15MB RSS idle.
      // Fallback if Bun is not installed on the VM (restore these two lines):
      //   interpreter: 'node',
      //   interpreter_args: '--import tsx',
      interpreter: 'bun',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      }
    },
    {
      name: 'publish-worker',
      script: 'scripts/publish-worker.ts',
      interpreter: 'bun',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};