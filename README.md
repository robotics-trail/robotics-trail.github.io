# TRAIL — robotics-trail.github.io

Source for <https://robotics-trail.github.io>. Jekyll + [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes),
pulled in via `remote_theme` so there is no theme code in this repo. Pushing to
`master` triggers the GitHub Pages build; the site is live a couple of minutes
later.

## Run it locally

```bash
bundle install
bundle exec jekyll serve --watch
```

Then open <http://localhost:4000>.

`_config.yml` is **not** hot-reloaded — restart the server after editing it.
Files under `_data/` *are* picked up on save, which is the main reason the
publication list now lives there.

## Adding a publication

Publications are data, not markup. Open `_data/publications.yml`, copy an
existing block to the top of the file, and fill it in:

```yaml
- title: 'FOCI'
  topics: [planning, learning]
  image_path: 'assets/images/foci.png'
  alt: 'A quadrotor trajectory optimized through a Gaussian-splat reconstruction.'
  excerpt: 'Trajectory Optimization on Gaussian Splats<br/>
    [Paper](https://arxiv.org/abs/2505.08510){: .btn .btn--primary .btn--small .btn--success}
    **IROS 2025**'
```

Two fields are worth care:

- **`topics`** decides which filter buttons the paper appears under. Valid
  values live in `_data/topics.yml`. A paper with no topics still shows under
  "All" but will never match a filter.
- **`alt`** is what a screen reader announces and what image search indexes.
  One descriptive sentence. Every entry used to say `placeholder image 1`.
- **`bibkey`** points at an entry in `bibliography.bib`. Optional. Nothing is
  *rendered* from it, but it is what puts a `BibTeX` copy button on the card —
  see "The bibliography" below.

## Filter categories

Declared in `_data/topics.yml`, in the order the buttons appear:

| id | button |
|---|---|
| `planning` | Trajectory Planning |
| `optimization` | Optimization |
| `learning` | Learning-based |
| `aerial` | Aerial Robots |
| `legged` | Legged Robots |
| `estimation` | State Estimation |
| `constrained-nn` | Constrained NN |
| `other` | Other |

The set is deliberately not orthogonal. A paper is tagged with the **problem**
it addresses (planning, estimation), the **method** it uses (optimization,
learning, constrained-nn) and the **platform** it runs on (aerial, legged), so
most carry two or three tags and appear under several buttons. FOCI is
`[planning, optimization, legged]`.

To add a category: add it to `_data/topics.yml` and tag the relevant papers.
No template change.

## The bibliography

`bibliography.bib` is the only place bibliographic data lives, and **nothing is
generated from it** — there is no build step to run and nothing that can fall
out of sync. Edit the `.bib`, commit, done.

It sits at the repo root on purpose: Jekyll ignores underscore directories but
copies root files verbatim, so it is served at **`/bibliography.bib`**. Jekyll
never parses it; the browser fetches it directly:

- **A `Bib` button on every publication that has a `bibkey`,** inline with that
  paper's own Paper/Video/Code buttons. On click, `assets/js/bibtex.js` fetches
  `/bibliography.bib`, pulls that entry out by counting braces, and copies it
  to the clipboard. Papers with two entries (FASTER, RMADER — a conference
  paper plus its journal version) copy both. The file is fetched once and
  shared by all the buttons, and not at all until one is pressed.

  The button is appended to the entry's `excerpt` *before* markdownify, on the
  same line, so kramdown places it inside the same `<p>` as the other buttons
  rather than starting a new block.

- **An `Abstract` button beside it,** which reads the same fetched file. See
  *Authors and abstracts*.

- **`/bibliography/`**, linked from the `View .bib` button beside the
  PUBLICATIONS heading. It renders the file inline, plus `Copy all` and
  `Download .bib`.

So what a visitor copies is byte-identical to what is in the repo. The buttons
are `hidden` in the markup and unhidden by the script, so nobody without
JavaScript is shown a control that cannot work; `/bibliography/` falls back to
a plain link to the file.

**The accepted trade-off:** with JavaScript off — which includes most crawlers
and nearly everything behind an LLM fetching a URL — `/bibliography/` is an
empty `<pre>` and the buttons do nothing. Rendering it at build time was tried
and reverted: Jekyll cannot parse BibTeX and GitHub Pages will not run a plugin,
so it needs a generated file, and a generated file needs either a command run by
hand after every edit or the whole build moved into Actions. Neither was worth
it. This is a deliberate choice, not an oversight — see *Known issues*.

The one thing that can go wrong is a `bibkey` that matches no entry, which
leaves a button that silently says "Not found".
`.github/workflows/bibliography.yml` runs `scripts/check-bibliography.py` on
every push that touches either file to catch exactly that (plus duplicate keys,
and it reports `.bib` entries the site never shows). It is a guard, not a build
step — you should never need to run it by hand, and it does not build or deploy
anything.

## The research summary

The prose above the publication list is one paragraph in `_data/research.yml`,
rendered by `_includes/research-summary.html`. Edit the YAML, not the include.
It replaced a `researchinterests` block in `index.html` front matter that listed
the same directions as bullets and was never rendered by anything.

Three conventions hold it together, and the file repeats them: **bold marks the
research topics and nothing else** (those are the phrases people search for, and
the CSS gives them the accent colour on that assumption), **no individual papers
by name** (the list below already says which work is which), and **the
learning-based work leads**, with optimization mentioned in less space.

It is also, at the moment, the only continuous prose on the site — worth keeping
current for that reason alone.

## Authors and abstracts

Every card with a `bibkey` has an **Abstract** button beside **Bib**. It expands
a panel under the card showing the author list and the abstract, both read out
of `/bibliography.bib` at click time by `assets/js/bibtex.js` — the same cached
fetch the copy buttons use. Nothing is rendered into the page at build time, so
there is no second copy to drift.

22 of the 25 entries now carry an `abstract` field, taken from arXiv (by the
`arxiv.org` link on the matching card), from Semantic Scholar for the one IEEE
Access paper, and from MIT DSpace for the two theses. The three without one are
the 2016 Spanish conference paper and the two tech reports.

Adding a paper: put the abstract in `bibliography.bib` like any other field and
the button picks it up. `%` must be escaped as `\%`; `$...$` maths is fine — the
script converts the constructs this bibliography actually uses (`\text{}`,
`\mathbb{R}`, `^{...}`, `\cdot`, `\in`) to Unicode, and leaves anything it does
not recognise visible rather than mangling it.

**This is a reading convenience, not an SEO fix.** The panel is filled by
JavaScript, so a crawler that does not render sees an empty `div`. What *did*
change for machines is that `bibliography.bib` is a plain text file at a stable
URL and now contains the abstracts. Putting authors, venue and year into the
server-rendered card is a separate job — see the known issues below.

## Image and video pipeline

The homepage used to pull **28 MB** of images. It now pulls **1.3 MB** on
arrival and **4.4 MB** if you scroll past every card. Nothing was cropped or
resized below what the page actually displays.

Three things did it.

**The nine animations are video, not GIF.** They were 19.1 MB of GIF; the same
clips as VP9/WebM are 2.8 MB, a 6.5x reduction at SSIM 0.95–0.99 against the
source. `_data/publications.yml` carries a `video:` key for those entries and
`image_path` points at the poster frame.

```bash
ffmpeg -i in.gif -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos" \
  -c:v libvpx-vp9 -crf 32 -b:v 0 -pix_fmt yuv420p -an -row-mt 1 \
  -deadline good -cpu-used 2 out.webm
ffmpeg -i in.gif -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos" \
  -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -an -movflags +faststart out.mp4
ffmpeg -i in.gif -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -frames:v 1 \
  -c:v libwebp -quality 80 out-poster.webp
```

Even dimensions are forced because `yuv420p` requires them — that is the only
reason any clip changed size, and only ever by one pixel. The MP4 is a fallback
for browsers without WebM; only one of the two is ever downloaded.

**Nothing loads until you scroll to it.** `assets/js/pub-video.js` ships the
`<video>` elements with no `<source>` children at all and adds them from an
IntersectionObserver, so the initial page load fetches nine posters (144 KB) and
no video. Clips that scroll far away are torn back down. `prefers-reduced-motion`
gets controls and no autoplay.

**The stills are WebP at the size they are displayed.** Every card figure renders
at 398 CSS px, so they are capped at 800 px — 2x, sharp on a retina screen, and
nothing above that was ever visible. Several were absurdly oversized: two were
3500x2204. Quality is not a fixed number; each file steps through q=80/85/90/94
until it reaches SSIM 0.985 against the resized original, which is why some sit
at 80 and the noisy photographs at 94. The one image with transparency (the
Comillas logo) came out smaller lossless, so it is lossless.

`width` and `height` are now on every figure, so the grid reserves space before
anything loads instead of reflowing.

**The originals live in `_original-media/`.** Nothing references them and Jekyll
does not copy underscore-prefixed directories into `_site`, so they stay in the
repository but never ship — the built site went from ~46 MB to ~11 MB. To bring
one back: `git mv _original-media/<file> assets/images/` and repoint the
reference. Deleting the directory is equally fine; git has the history.

## Metadata and structured data

Two theme includes are overridden locally. Jekyll prefers a file in this repo
over the theme's copy of the same name, so these win without any config.

`_includes/seo.html` — forked from Minimal Mistakes **4.28.1**, byte-identical
to upstream except for two blocks marked `TRAIL:`. It adds two front matter
keys:

| key | what it does |
| --- | --- |
| `seo_title` | sets `<title>` and `og:title` independently of the visible `<h1>` |
| `og_type`   | overrides the `og:type` the theme derives from `page.date` |

`seo_title` exists because upstream derives the title tag from `page.title`,
which is also the hero heading. Two pages need those to differ: the homepage
`<h1>` is the styled word "TRAIL", and `/jtorde/`'s is a portrait image — which
is why that page used to ship `<title> - Jesus Tordesillas Torres</title>`.

To resync after a theme upgrade: diff this file against the new upstream
`_includes/seo.html` and re-apply the two marked blocks.

`_includes/schema.html` — replaces the theme's. Upstream emitted, on the
homepage only, a `Person` whose `name` was literally `null` (it reads
`site.social.name`, which was never set); structured data with a null required
property is thrown away. This describes the lab instead, which is what the
homepage is about.

Four blocks are emitted in all, each on the pages where it belongs:

| block | where | source |
| --- | --- | --- |
| `ResearchOrganization` | homepage | `_includes/schema.html` |
| `Person` | `/jtorde/` | `_includes/head/custom.html` |
| `BreadcrumbList` | every page but the homepage | `_includes/head/custom.html` |

There is deliberately no `ScholarlyArticle` markup. It needs authors, venue and
year at build time, which means parsing the `.bib` — see *The bibliography* for
why that is not done. Structured data also has to describe what the page shows,
and no page currently shows those fields.

Both read their `sameAs` lists from `_config.yml` (`org_sameas`, `person_sameas`).
Keep those honest — `sameAs` is a claim that the profiles *are the same entity* —
and make sure each profile links back here. Still worth adding: an ORCID, a
claimed Semantic Scholar author page, an OpenAlex record, a Wikidata item.

**Validate any change** at <https://validator.schema.org> before pushing.

### Per-page front matter

Every page carries an explicit `description` (aim for 150–160 characters; it is
the snippet a searcher reads) and, where the title tag should differ from the
heading, a `seo_title`. No page carries a `date` — the theme turns any dated
page into `og:type=article` with an `article:published_time`, and both the
homepage and `/jtorde/` used to be advertised as articles published in 2016.

## Layout

```
_config.yml                    site settings (no content)
bibliography.bib                  the bibliography; served at /bibliography.bib
scripts/check-bibliography.py     CI guard: every bibkey resolves
_pages/bibliography.md            the /bibliography/ viewer
assets/js/bibtex.js               copy buttons + viewer, both fetch the .bib
_data/publications.yml         the publication list
_data/topics.yml               filter topics
_data/navigation.yml           top menu
_includes/publication-row.html renders the publication list; a drop-in
                               replacement for the theme's feature_row
_data/research.yml             the one-paragraph research summary
assets/js/pub-video.js         lazy playback for the publication clips
_original-media/               pre-WebP originals; never built
_includes/research-summary.html  renders it
_includes/head/custom.html     filter styles + script tag, form embed CSS,
                               and the Person JSON-LD for /jtorde/
assets/js/publication-filter.js  the client-side filtering
_includes/seo.html             fork of the theme's; adds seo_title + og_type
_includes/schema.html          replaces the theme's; the lab's Organization
                               JSON-LD, homepage only
_pages/                        one file per page
```

## Known issues not addressed here

Real problems on the site that this branch deliberately does not touch:

- **The two hero backgrounds are still the heaviest single downloads**
  (`mine1_compressed.webp` at 399 KB, `mader_header_white.webp` at 52 KB). The
  first is a noisy photograph that does not compress well; a tighter crop would
  do more than another encoder pass.
- **Two empty link targets on `/people/`** (`[Carlos Martínez Cuenca]()` and
  `[Jonatan Flink Ornung]()`) render as dead buttons.
- **No favicon**, and no analytics, so there is no way to tell whether the
  call for PhD students is reaching anyone.
- **`/bibliography/` is empty without JavaScript**, and so are the Bib and
  Abstract buttons. Accepted on purpose: the fix needs a generated file plus
  either a manual regeneration step or moving the build into Actions. Revisit
  if the build ever moves to Actions for another reason.
- **31 publications still share one URL**, and the server-rendered card still
  shows no authors, venue or year — the Abstract panel supplies them to readers
  but not to crawlers. The eight topic filters are client-side toggles rather
  than pages. This is the largest remaining gap for both search engines and
  language models, and the fix is a `_publications` collection with a page per
  paper, generated from `bibliography.bib` at build time.
- **`www.mit.edu/~jtorde` is still live** with near-identical content, no
  canonical tag and no redirect, on a domain that outranks this one.
