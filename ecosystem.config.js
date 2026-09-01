module.exports = {
  apps: [
    {
      name: 'render-worker',
      script: 'scripts/render-worker.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
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
      interpreter: 'node',
      interpreter_args: '--import tsx',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
