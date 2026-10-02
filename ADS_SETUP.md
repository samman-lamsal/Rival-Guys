# AdSense / H5 Games Ads setup

The Rival Guys game contains ad hooks, but advertising remains disabled until you add your real publisher ID and enable it.

## Before enabling ads
1. Publish `masarpstudio.com` and make sure all site pages work.
2. Add the site in Google AdSense and complete site/identity review.
3. Keep `privacy.html` public. It already explains Google advertising cookies, identifiers and personalized advertising choices.
4. For visitors in the EEA, UK and Switzerland, configure a **Google-certified consent management platform (CMP)** through AdSense before serving ads where required.
5. When AdSense gives you your publisher ID, edit `js/ads-config.js`:
   - replace `ca-pub-REPLACE_WITH_YOUR_ID`
   - set `enabled: true`
6. Create `/ads.txt` at the domain root using the exact line provided by AdSense. Do not guess the publisher ID. `ads.txt.example` is only a template.

## Current Rival Guys ad design
- interstitial opportunities at natural game breaks
- minimum spacing between interstitials
- opt-in rewarded ad for bonus rewards
- no banner placed beside movement/attack controls

Never click your own live ads or ask players to click ads to support the site.
