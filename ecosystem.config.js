// PM2 settings: keeps the site running in the background and restarts it if it stops.
// Same file works on this PC and on the live server.
//   pm2 start ecosystem.config.js     (start)
//   pm2 reload kitabnagri             (after `npm run build`, no downtime)
//   pm2 logs kitabnagri               (see errors)
module.exports = {
  apps: [
    {
      name: "kitabnagricompk",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: { NODE_ENV: "production" },
    },
  ],
};
