/*
 * TRAIL — publication topic filter.
 *
 * Purely client-side: every card is already in the DOM, the buttons just
 * toggle `hidden` on the ones that do not carry the selected topic. No page
 * reload and no duplicated markup. The filter bar carries `hidden` in the
 * markup and is revealed below, so with JavaScript off the buttons genuinely
 * do not appear rather than sitting there doing nothing. Every paper stays
 * visible either way — nothing is ever hidden from a crawler or from a reader
 * without JS.
 *
 * Topics come from data-topics="..." which _includes/publication-row.html
 * writes out from _data/publications.yml.
 */
(function () {
  'use strict';

  var buttons = document.querySelectorAll('.pub-filter');
  if (!buttons.length) return;

  var bar = document.querySelector('.pub-filter-bar');
  if (bar) bar.hidden = false;

  var items = document.querySelectorAll('.feature__wrapper [data-topics]');
  var count = document.querySelector('.pub-filter-count');
  var total = items.length;

  /*
   * The theme lays these cards out as floats and decides each one's
   * `clear` and `margin-inline-start` with :nth-child(3n+1/2/3). Those
   * selectors count hidden elements too, so as soon as we hide a card the
   * clears land on the wrong ones and the grid tears open with blank gaps.
   *
   * So after every filter we re-stamp data-col="1|2|3" by *visible* position
   * and let the CSS in _includes/head/custom.html override the nth-child
   * rules. Nothing is stamped before the first click, so a page nobody has
   * filtered renders exactly as the theme intended.
   */
  function relayout(visible) {
    visible.forEach(function (item, i) {
      item.setAttribute('data-col', (i % 3) + 1);
    });
  }

  function apply(topic, label) {
    var shown = 0;
    var visible = [];
    Array.prototype.forEach.call(items, function (item) {
      var topics = (item.getAttribute('data-topics') || '').split(/\s+/);
      var show = topic === 'all' || topics.indexOf(topic) !== -1;
      item.hidden = !show;
      if (show) { shown++; visible.push(item); }
    });
    relayout(visible);
    if (count) {
      count.textContent = topic === 'all'
        ? ''
        : 'Showing ' + shown + ' of ' + total + ' — ' + label;
    }
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(buttons, function (b) {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      apply(btn.getAttribute('data-filter'), btn.textContent.trim());
    });
    btn.setAttribute('aria-pressed', btn.classList.contains('is-active') ? 'true' : 'false');
  });
})();
