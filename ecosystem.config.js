// PM2 settings: keeps the site running in the background and restarts it if it stops.
// Port 3115 — the same as `npm start` (package.json) and PORT in .env.
//   pm2 start ecosystem.config.js       (start)
//   pm2 reload kitabnagricompk          (after `npm run build`, no downtime)
//   pm2 logs kitabnagricompk            (see errors)
module.exports = {
  apps: [
    {
      name: "kitabnagricompk",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3115",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production", PORT: "3115" },
    },
  ],
};
