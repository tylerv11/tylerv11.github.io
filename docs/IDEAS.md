# Ideas backlog

Things worth building on the portfolio, roughly ordered by value-per-hour.
Nothing here is committed to. Captured so good ideas don't evaporate.

## Analytics

**Referrer breakdown.** The Worker already stores `ref` (hostname only) on every
row, and nothing surfaces it. A single panel showing whether a visit came from
LinkedIn, Indeed, a specific company, or direct is probably the highest-value
addition left — for job hunting, *where* someone came from matters more than
what they clicked. Cheap: one `GROUP BY ref` and one more bar list.

**"Recruiter sessions" view.** Sessions that hit the resume plus at least two
project tiles look categorically different from a drive-by. Filter to those and
the dashboard answers the question you actually care about: what do serious
visitors look at?

**Scroll depth per page.** Dwell says *whether* a section was seen; depth says
how far down the page people get before leaving. Cheap to add to the existing
IntersectionObserver.

**Email or Discord digest.** Weekly summary pushed to you instead of pulled.
The health-check workflow is already a scheduled job with a working `/stats`
call — extending it to post a digest is small. Hermes already posts to Discord,
so the pattern exists.

**Compare ranges.** "Last 30 days vs. the 30 before" on the KPI cards. Absolute
numbers on a low-traffic site are hard to read; direction is easier.

**Rate-limit `/stats`.** The password is intentionally weak and there's no
throttle on attempts. Not urgent while `/admin` is unlinked and undiscovered,
but it's the obvious hardening step if the URL ever gets published.

## Site

**Resume as HTML, not just PDF.** A `/resume` page would be indexable, mobile
friendly, and trackable at section granularity instead of one `resume_view`
event. Keep the PDF for download.

**Per-project case study pages.** Tiles are good for scanning, bad for depth.
The tiles that get the most `tile_dwell` are the ones that have earned a real
page — let the analytics decide which.

**OG images per page.** Links to the site currently unfurl bare in Slack and
LinkedIn. Low effort, disproportionate polish.

**Faster first paint.** `index.html` is ~5000 lines with inline CSS and JS.
Fine for now; if it grows further, splitting the critical CSS is the first move.

## Infra

**Custom domain.** `tylervincent.dev` or similar reads better on a resume than
`tylerv11.github.io`, and it would decouple the URL from GitHub. Note this
interacts with making the repo private — see below.

**Private repo.** Wanted, but GitHub Pages from a private repo requires Pro or
higher; on a Free plan flipping it takes the live site offline. Decide the plan
question first.

**Automated Lighthouse run.** Same schedule as the analytics health check.
Catches performance regressions from the redesign work.
