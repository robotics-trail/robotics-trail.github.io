source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins

gem "tzinfo-data"
gem "wdm", "~> 0.1.0" if Gem.win_platform?

# If you have any plugins, put them here!
group :jekyll_plugins do
  gem "jekyll-paginate"
  gem "jekyll-sitemap"
  gem "jekyll-gist"
  gem "jekyll-feed"
  gem "jemoji"
  gem "jekyll-include-cache"
  # gem "jekyll-algolia"   # was declared here but never enabled in _config.yml,
  #                        # and it needs an API key plus an index-build step.
  gem "jekyll-remote-theme"  # needed for `bundle exec jekyll serve` locally,
                             # since the theme is fetched at build time.
end

gem "webrick", "~> 1.7"
