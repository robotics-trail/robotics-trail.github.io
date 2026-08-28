# Superseded media

The originals of everything under `assets/images/`, kept after the site moved to
WebP stills and WebM/MP4 clips. Nothing here is referenced by any page.

The directory name starts with an underscore, so Jekyll does not copy it into
`_site` — it stays in the repository but never ships. That is the whole point:
the built site went from ~46 MB to ~10 MB without losing the sources.

Reversing a single file is `git mv _original-media/<file> assets/images/` plus
pointing the reference back at it. Deleting this directory outright is also fine
— every file is in the git history.

Rebuilding the derived assets: the encoder settings are recorded in the
"Image and video pipeline" section of the top-level README.
