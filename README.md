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
