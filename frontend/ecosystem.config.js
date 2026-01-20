module.exports = {
  apps: [
    {
      name: "dedata-app",
      script: "npm",
      args: "start",
      cwd: "./",
      env_file: ".env.production",
      env: {
        NODE_ENV: "production"
      },
      error_file: "logs/app-error.log",
      out_file: "logs/app-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false
    },
    {
      name: "dedata-worker",
      script: "npm",
      args: "run worker:prod",
      cwd: "./",
      env_file: ".env.production",
      env: {
        NODE_ENV: "production"
      },
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      watch: false
    }
  ]
}
