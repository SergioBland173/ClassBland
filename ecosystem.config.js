module.exports = {
  apps: [
    {
      name: 'classbland-server',
      script: 'start-server.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        WEBHOOK_SECRET: 'cambia-este-secreto-por-uno-seguro'
      },
      watch: false,
      exec_mode: 'fork',
      autorestart: true
    }
  ]
}
