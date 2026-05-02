// Netlify Build plugin: cloudflare-purge
// Purges the entire Cloudflare CDN cache for the configured zone after
// a successful Netlify deploy so visitors always get the latest assets.
//
// Credentials are read from environment variables (CLOUDFLARE_ZONE_ID and
// CLOUDFLARE_API_TOKEN) so the plugin works without any [plugins.inputs]
// block in netlify.toml.  When the variables are absent (e.g. deploy
// previews) the plugin skips silently so the deploy still succeeds.

module.exports = {
  onSuccess: async ({ inputs, utils }) => {
    const zoneId =
      (inputs && inputs.cloudflare_zone_id) || process.env.CLOUDFLARE_ZONE_ID;
    const apiToken =
      (inputs && inputs.cloudflare_api_token) || process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      console.log(
        'cloudflare-purge: CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN not set — skipping cache purge.',
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

    let data;
    try {
      data = await response.json();
    } catch (err) {
      utils.build.failBuild(
        `cloudflare-purge: unexpected non-JSON response from Cloudflare (HTTP ${response.status})`,
      );
      return;
    }

    if (!response.ok || !data.success) {
      const errors = (data.errors || []).map((e) => e.message).join('; ');
      utils.build.failBuild(
        `cloudflare-purge: Cloudflare API returned an error (HTTP ${response.status}): ${errors}`,
      );
      return;
    }

    utils.status.show({ summary: `Successfully purged Cloudflare cache for zone ${zoneId}` });
  },
};
