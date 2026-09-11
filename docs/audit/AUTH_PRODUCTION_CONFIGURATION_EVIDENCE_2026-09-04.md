# Auth production configuration evidence — 2026-09-04

Read-only Netlify verification confirms that production has both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` populated with the same Google Web Client ID. The current production deployment for `main@43f456b103d0465bb58895b0367cd07f3b3b93e8` is ready and published.

This closes the production Google client-ID configuration sub-gate only. It does **not** replace the remaining requirement for fresh post-cutover, role-bound interactive Google Buyer and Seller evidence. No credential evidence is fabricated.

Security observation: the Netlify environment inventory also shows that some credential-bearing values are configured as non-secret variables. Their values must not be copied into repository documentation or chat. Secret-classification hygiene should be remediated separately without rotating or changing production credentials during this audit unless necessary.
