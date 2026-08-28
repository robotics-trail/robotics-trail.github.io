/*
 * TRAIL — BibTeX copy buttons, the authors/abstract panels, and the
 * /bibliography/ viewer.
 *
 * All of them read /bibliography.bib itself, over the network, at the moment
 * they are used. Nothing is transcribed into the page at build time, so what a
 * visitor copies is always exactly what is in the file — there is no second
 * copy that can drift, and no build step.
 *
 * The trade-off, accepted deliberately: with JavaScript off there is nothing
 * behind any of it. /bibliography/ falls back to a plain link to the file.
 *
 * The file is fetched once per page load and shared by every button.
 */
(function () {
  'use strict';

  var BIB_URL = document.documentElement.getAttribute('data-bib-url') || '/bibliography.bib';

  var cache = null;      // resolved text
  var inflight = null;   // shared promise, so N buttons cause 1 request

  function loadBib() {
    if (cache !== null) return Promise.resolve(cache);
    if (!inflight) {
      inflight = fetch(BIB_URL, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (text) { cache = text; return text; })
        .catch(function (err) { inflight = null; throw err; });
    }
    return inflight;
  }

  /*
   * Pull one @entry{key, ...} out of the file by counting braces, so titles
   * like {{FASTER}: ...} and multi-line abstracts survive intact.
   */
  function extractEntry(text, key) {
    var safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('@\\w+\\s*\\{\\s*' + safe + '\\s*,');
    var m = re.exec(text);
    if (!m) return null;

    var open = text.indexOf('{', m.index);
    if (open === -1) return null;

    var depth = 0;
    for (var i = open; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return text.slice(m.index, i + 1);
      }
    }
    return null;   // unbalanced braces in the .bib
  }

  /*
   * Pull one field out of an entry, counting braces so that nested groups
   * ({\"u}, {MINVO}, $\mathbb{R}^n$) and wrapped multi-line values survive.
   * Returns the raw value with its outer delimiters removed.
   */
  function field(entry, name) {
    var re = new RegExp('[,{]\\s*' + name + '\\s*=\\s*', 'i');
    var m = re.exec(entry);
    if (!m) return null;

    var i = m.index + m[0].length;
    var open = entry[i];
    if (open !== '{' && open !== '"') {
      // Unbraced numeric value, e.g. `year = 2022,`
      return (entry.slice(i).match(/^[^,\n}]*/) || [''])[0].trim();
    }
    if (open === '"') {
      var end = entry.indexOf('"', i + 1);
      return end === -1 ? null : entry.slice(i + 1, end);
    }
    var depth = 0;
    for (var j = i; j < entry.length; j++) {
      if (entry[j] === '{') depth++;
      else if (entry[j] === '}') {
        depth--;
        if (depth === 0) return entry.slice(i + 1, j);
      }
    }
    return null;
  }

  var ACCENTS = {
    "'a": '\u00e1', "'e": '\u00e9', "'i": '\u00ed', "'o": '\u00f3', "'u": '\u00fa',
    "'A": '\u00c1', "'E": '\u00c9', "'I": '\u00cd', "'O": '\u00d3', "'U": '\u00da',
    '"a': '\u00e4', '"e': '\u00eb', '"i': '\u00ef', '"o': '\u00f6', '"u': '\u00fc',
    '"A': '\u00c4', '"O': '\u00d6', '"U': '\u00dc',
    '`a': '\u00e0', '`e': '\u00e8', '`i': '\u00ec', '`o': '\u00f2', '`u': '\u00f9',
    '^a': '\u00e2', '^e': '\u00ea', '^i': '\u00ee', '^o': '\u00f4', '^u': '\u00fb',
    '~n': '\u00f1', '~N': '\u00d1', '~a': '\u00e3', '~o': '\u00f5',
    'cc': '\u00e7', 'cC': '\u00c7'
  };

  /*
   * Just enough LaTeX to render what is actually in this .bib. Accents and
   * escaped punctuation are always undone. Braces are only stripped when
   * `dropBraces` is set: in a title or an author list they are BibTeX's
   * capitalisation guard ({MINVO}) and mean nothing to a reader, but in an
   * abstract they are real LaTeX groups ($\mathbb{R}^n$) and removing them
   * would corrupt the maths.
   */
  function deLatex(str, dropBraces) {
    if (!str) return '';
    var out = str
      .replace(/\{\\(['"`^~c])\s*([A-Za-z])\}/g, function (all, acc, ch) {
        return ACCENTS[acc + ch] || ch;
      })
      .replace(/\\(['"`^~])\{([A-Za-z])\}/g, function (all, acc, ch) {
        return ACCENTS[acc + ch] || ch;
      })
      .replace(/\\ss\b/g, '\u00df')
      .replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_')
      .replace(/\\\$/g, '$').replace(/\\#/g, '#')
      .replace(/~/g, ' ')
      .replace(/\$([^$]+)\$/g, function (all, inner) { return mathToUnicode(inner); });
    if (dropBraces) out = out.replace(/[{}]/g, '');
    return out.replace(/\s+/g, ' ').trim();
  }

  var SUP = {
    '0':'\u2070','1':'\u00b9','2':'\u00b2','3':'\u00b3','4':'\u2074','5':'\u2075',
    '6':'\u2076','7':'\u2077','8':'\u2078','9':'\u2079','+':'\u207a','-':'\u207b',
    'n':'\u207f','i':'\u2071','t':'\u1d57','h':'\u02b0','r':'\u02b3','d':'\u1d48',
    's':'\u02e2','a':'\u1d43','b':'\u1d47','e':'\u1d49','m':'\u1d50','o':'\u1d52',
    'p':'\u1d56','x':'\u02e3'
  };

  /*
   * One abstract in the bibliography (MINVO) is written in LaTeX maths, and
   * printing "$n^{\text{th}}$-degree" at a reader is worse than doing nothing.
   * The set of constructs actually used is small and closed, so this converts
   * them to Unicode rather than pulling in a maths typesetter. Anything not
   * recognised is left as-is, minus the dollar signs.
   */
  function mathToUnicode(inner) {
    var out = inner
      .replace(/\\(?:text|mathrm|mathit|operatorname)\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\mathbb\s*\{R\}/g, '\u211d')
      .replace(/\\mathbb\s*\{N\}/g, '\u2115')
      .replace(/\\mathbb\s*\{Z\}/g, '\u2124')
      .replace(/\\mathbb\s*\{Q\}/g, '\u211a')
      .replace(/\\cdot/g, '\u00b7')
      .replace(/\\times/g, '\u00d7')
      .replace(/\\leq?\b/g, '\u2264')
      .replace(/\\geq?\b/g, '\u2265')
      .replace(/\\neq\b/g, '\u2260')
      .replace(/\\approx\b/g, '\u2248')
      .replace(/\\infty\b/g, '\u221e')
      .replace(/\\in\b/g, '\u2208')
      .replace(/\\,|\\;|\\!|\\ /g, ' ');

    // Superscripts: ^{th} and ^3 alike, but only when every character has a
    // Unicode superscript. Otherwise the caret is left visible and honest.
    out = out.replace(/\^\{([^{}]*)\}|\^(\S)/g, function (all, braced, single) {
      var body = braced !== undefined ? braced : single;
      var mapped = '';
      for (var i = 0; i < body.length; i++) {
        var c = SUP[body[i]];
        if (!c) return all;
        mapped += c;
      }
      return mapped;
    });

    return out.replace(/[{}]/g, '');
  }

  /*
   * BibTeX author lists are "Last, First and Last, First" (or "First Last and
   * ..."). Turn them into reading order. "and others" becomes "et al.".
   */
  function formatAuthors(raw) {
    if (!raw) return [];
    return deLatex(raw, true)
      .split(/\s+and\s+/i)
      .map(function (name) {
        name = name.trim();
        if (!name) return '';
        if (name === 'others') return 'et al.';
        var parts = name.split(',');
        if (parts.length === 2) return (parts[1].trim() + ' ' + parts[0].trim()).trim();
        return name;
      })
      .filter(Boolean);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for http:// and older browsers.
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy blocked'));
    });
  }

  function flash(btn, message, isError) {
    var original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = message;
    btn.classList.toggle('is-error', !!isError);
    btn.classList.toggle('is-done', !isError);
    clearTimeout(btn._resetTimer);
    btn._resetTimer = setTimeout(function () {
      btn.textContent = btn.dataset.label;
      btn.classList.remove('is-done', 'is-error');
    }, 2000);
  }

  /* ---------- per-publication copy buttons ---------- */

  var buttons = document.querySelectorAll('.bibtex-copy');
  Array.prototype.forEach.call(buttons, function (btn) {
    // Progressive enhancement: the button is markup-hidden until JS runs, so
    // nobody is shown a control that cannot work.
    btn.hidden = false;

    btn.addEventListener('click', function () {
      // One publication can map to several .bib entries (a conference paper
      // and its journal version); copy all of them.
      var keys = (btn.getAttribute('data-bibkey') || '').split(/\s+/).filter(Boolean);
      if (!keys.length) return;

      loadBib().then(function (text) {
        var entries = keys.map(function (k) { return extractEntry(text, k); }).filter(Boolean);
        if (!entries.length) {
          flash(btn, 'Not found', true);
          return;
        }
        return copyText(entries.join('\n\n') + '\n').then(function () {
          flash(btn, entries.length > 1 ? 'Copied ' + entries.length + '!' : 'Copied!');
        });
      }).catch(function () {
        flash(btn, 'Failed', true);
      });
    });
  });

  /* ---------- per-publication authors + abstract ---------- */

  /*
   * A disclosure, not a new page: the panel is a sibling of the card body and
   * is filled the first time it is opened, from the same cached .bib the copy
   * buttons use. Nothing here is rendered at build time.
   */
  var detailButtons = document.querySelectorAll('.pub-details-btn');
  Array.prototype.forEach.call(detailButtons, function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

    var key = (btn.getAttribute('data-bibkey') || '').trim();
    if (!key) return;

    var loaded = false;

    function fill(text) {
      var entry = extractEntry(text, key);
      if (!entry) {
        panel.innerHTML = '<p class="pub-details__empty">This entry is not in the bibliography file.</p>';
        return;
      }
      var authors = formatAuthors(field(entry, 'author'));
      var abstract = deLatex(field(entry, 'abstract'), false);
      var html = '';
      if (authors.length) {
        html += '<p class="pub-details__authors">' + authors.map(escapeHtml).join(', ') + '</p>';
      }
      html += abstract
        ? '<p class="pub-details__abstract">' + escapeHtml(abstract) + '</p>'
        : '<p class="pub-details__empty">No abstract on file for this entry.</p>';
      panel.innerHTML = html;
    }

    btn.hidden = false;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      if (open) {
        btn.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        return;
      }
      btn.setAttribute('aria-expanded', 'true');
      panel.hidden = false;
      if (loaded) return;

      panel.innerHTML = '<p class="pub-details__empty">Loading\u2026</p>';
      loadBib().then(function (text) {
        loaded = true;
        fill(text);
      }).catch(function () {
        panel.innerHTML = '<p class="pub-details__empty">Could not load the bibliography.</p>';
      });
    });
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- /bibliography/ viewer ---------- */

  var viewer = document.getElementById('bib-viewer');
  if (viewer) {
    var status = document.getElementById('bib-status');
    loadBib().then(function (text) {
      viewer.textContent = text;
      if (status) {
        var n = (text.match(/^\s*@(?!preamble|string|comment)\w+\s*\{/gmi) || []).length;
        status.textContent = n + ' entries';
      }
    }).catch(function () {
      viewer.textContent = 'Could not load ' + BIB_URL + '.';
      if (status) status.textContent = '';
    });

    var copyAll = document.getElementById('bib-copy-all');
    if (copyAll) {
      copyAll.hidden = false;
      copyAll.addEventListener('click', function () {
        loadBib()
          .then(function (text) { return copyText(text); })
          .then(function () { flash(copyAll, 'Copied!'); })
          .catch(function () { flash(copyAll, 'Failed', true); });
      });
    }
  }

})();
