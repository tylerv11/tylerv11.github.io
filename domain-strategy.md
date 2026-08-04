# Domain & Subdomain Strategy

Live pricing pulled from Vercel's registrar API on 2026-07-28 (updated 2026-07-29). All prices are first-year registration; renewals are often higher (especially `.io`, which typically renews near its first-year price or slightly above — check before committing to multi-year use).

## Top choice: `sladestudio.co` — $4.99/yr

Cheapest option found, singular spelling (matches the only spelling that's actually open across every TLD checked — `.us`, `.io`, `.app`, `.biz` all rejected the plural), and `.co` reads as trustworthy/professional, close to a `.com` substitute rather than a novelty TLD.

Runner-up: **`sladehq.us` — $7.99/yr** — shorter name, still trustworthy `.us` TLD, if you'd rather drop "studio" from the brand entirely.

Also available at the same price point: `sladestudio.us` ($7.99/yr), `sladestudios.co` ($4.99/yr, plural — skip per above).

## Candidates you listed

| Domain | Available? | Price/yr |
|---|---|---|
| sladestudios.org | ✅ | $8.49 |
| sladestudios.llc | ✅ | $11.99 |
| sladestudios.art | ✅ | $7.99 |
| sladestud.io | ✅ | $37.99 |
| sladestudio.app | ✅ | $9.99 |
| sladestudio.us | ✅ | $7.99 |
| sladestudio.biz | ✅ | $11.99 |

## The `.com` you actually want is taken

Neither **sladestudios.com** nor **sladestudio.com** is available — that's likely why your own examples drifted between the two spellings. This matters: pick one canonical spelling now, because a `.io`/`.org`/`.us` domain under the "wrong" spelling will read as a typo forever if the real `.com` ever changes hands.

## Extra options checked (since you want `.io` / `.com` / `.us` specifically)

| Domain | Available? | Price/yr |
|---|---|---|
| sladestudios.io | ✅ | $37.99 |
| sladestudio.io | ✅ | $37.99 |
| sladestudios.us | ✅ | $7.99 |
| sladestudiosco.com | ✅ | $11.25 |
| slade.io | ❌ taken | — |
| slade.com | ❌ taken | — |
| crazedslade.com | ✅ | $11.25 |
| crazedslade.io | ✅ | $37.99 |
| crazedslade.us | ✅ | $7.99 |

## Recommendation

Given your own filter (trusted TLD, broad enough for portfolio + shop + Shopify-style storefront):

**Best pick: `sladestudio.us` — $7.99/yr.**
- `.us` reads as legitimate/trustworthy (it's a country-code TLD tied to real US registration, not an obscure gTLD), cheap to hold long-term, and avoids the `.io`/`.app` "startup toy" connotation for what's really a personal studio brand.
- Singular "sladestudio" avoids the plural/singular drift your examples already show, and it's free across every TLD you'd want (`.us`, `.io`, `.app`, `.biz` all open under the singular).

**Runner-up: `sladestudio.io` — $37.99/yr.** More expensive and renews at a similar rate every year, but `.io` is the most universally recognized "this is a real tech/dev brand" signal if you want that specific read. Worth it only if the extra ~$30/yr buys you something the `.us` doesn't (it mostly doesn't, unless you care about `.io`'s tech-industry connotation specifically).

Skip `crazedslade.*` unless "Slade Studios" stops being the brand you want — it reads as a different, punchier identity, not a professional umbrella brand, and would fight against the portfolio/shop use case.

## Proposed subdomain structure (using `sladestudio.us` as the example root)

```
sladestudio.us              → portfolio / landing page (this GitHub Pages site, or a redirect to it)
hermes.sladestudio.us        → Hermes Events
plutus.sladestudio.us        → Plutus Markets
store.sladestudio.us         → future web shop / Shopify storefront
```

Each subdomain is just a DNS CNAME record pointing at whatever host serves that project (Vercel, GitHub Pages, Shopify's custom-domain CNAME target, etc.) — no code from one project has to touch another, they just share a parent zone.

## On "am I doing too much"

Unifying under one root domain is low-risk, not over-engineering — DNS subdomains are free to add/remove and completely isolate the underlying codebases; the only shared thing is the zone file. The actual risk you should weigh is Shopify: a Shopify store on `store.sladestudio.us` still runs Shopify's checkout/backend, so it doesn't couple to your other apps technically, but it does tie your professional/portfolio brand to a commerce storefront in the public's eye — worth deciding on purpose rather than by default, not because it's technically risky.
