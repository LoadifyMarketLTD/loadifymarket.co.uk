/**
 * Netlify Build Plugin: cloudflare-purge
 *
 * Purges the entire Cloudflare cache zone after a successful production deploy.
 * This ensures visitors always see the latest version of the site immediately
 * after Netlify finishes deploying, without waiting for Cloudflare's TTL to
 * expire.
 *
 * Required environment variables (set in Netlify dashboard → Site settings →
 * Environment variables):
 *   CLOUDFLARE_API_TOKEN  — API token with Zone:Cache Purge permission
 *   CLOUDFLARE_ZONE_ID    — Zone ID from Cloudflare dashboard (right sidebar
 *                           on the domain overview page)
 *
 * The plugin is a no-op (exits cleanly) when either variable is missing, so
 * preview deploys and local `netlify dev` sessions are unaffected.
 */

const https = require('https');

module.exports = {
  onSuccess: async ({ utils }) => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      console.log(
        '[cloudflare-purge] CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID not set — skipping cache purge.',
      );
      return;
    }

    const body = JSON.stringify({ purge_everything: true });

    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4/zones/${zoneId}/purge_cache`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.success) {
              console.log('[cloudflare-purge] ✓ Cloudflare cache purged successfully.');
              resolve();
            } else {
              const errors = JSON.stringify(json.errors);
              utils.build.failPlugin(`Cloudflare purge failed: ${errors}`);
              reject(new Error(errors));
            }
          } catch (e) {
            utils.build.failPlugin(`Cloudflare purge response parse error: ${e.message}`);
            reject(e);
          }
        });
      });

      req.on('error', (e) => {
        utils.build.failPlugin(`Cloudflare purge request error: ${e.message}`);
        reject(e);
      });

      req.write(body);
      req.end();
    });
  },
};
