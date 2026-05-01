// Netlify Build plugin: cloudflare-purge
// Purges the entire Cloudflare CDN cache for the configured zone after
// a successful Netlify deploy so visitors always get the latest assets.

module.exports = {
  onSuccess: async ({ inputs, utils }) => {
    const { cloudflare_zone_id: zoneId, cloudflare_api_token: apiToken } = inputs;

    if (!zoneId || !apiToken) {
      utils.build.failBuild(
        'cloudflare-purge: cloudflare_zone_id and cloudflare_api_token are both required.',
      );
      return;
    }

    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      });
    } catch (err) {
      utils.build.failBuild(`cloudflare-purge: network error calling Cloudflare API – ${err.message}`);
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      const errors = (data.errors || []).map((e) => e.message).join('; ');
      utils.build.failBuild(
        `cloudflare-purge: Cloudflare API returned an error (HTTP ${response.status}): ${errors}`,
      );
      return;
    }

    console.log(`cloudflare-purge: successfully purged cache for zone ${zoneId}`);
  },
};
