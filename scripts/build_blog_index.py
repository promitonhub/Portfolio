#!/usr/bin/env python3
from pathlib import Path
from html import escape
import re
from build_blogs import ROOT, CONTENT, THUMBS, parse

def main():
    posts = []
    for source in CONTENT.glob("BC*.txt"):
        m = re.fullmatch(r"BC(\d+)", source.stem)
        if not m:
            continue
        n = int(m.group(1))
        thumb = THUMBS / f"BT{n}.png"
        if not thumb.is_file():
            continue
        meta, body, title = parse(source)
        excerpt = meta.get("excerpt") or re.sub(r"\s+", " ", re.sub(r"[#>*_`]", "", body)).strip()[:220]
        posts.append({"n":n, "title":title, "excerpt":excerpt, "category":meta.get("category","Article"),
                      "date":meta.get("date",""), "reading":meta.get("reading_time",""),
                      "alt":meta.get("alt",title), "url":f"/blogs/{n}/",
                      "image":f"/blogs/Blog_Thunbnails/BT{n}.png"})
    posts.sort(key=lambda p:(p["date"], p["n"]), reverse=True)
    if not posts:
        raise SystemExit("No matching blog content/thumbnail pairs found.")
    cats = sorted({p["category"] for p in posts})
    filters = [f'<button class="filter-button is-active" data-filter="all" aria-pressed="true">All writing <span>{len(posts)}</span></button>']
    for cat in cats:
        count = sum(p["category"] == cat for p in posts)
        filters.append(f'<button class="filter-button" data-filter="{escape(cat, quote=True)}" aria-pressed="false">{escape(cat)} <span>{count}</span></button>')
    cards = []
    for p in posts:
        search = escape((p["title"]+" "+p["excerpt"]+" "+p["category"]).lower(), quote=True)
        cards.append(f'''
<article class="post-card" data-category="{escape(p["category"], quote=True)}" data-search="{search}">
 <a class="post-image-link" href="{p["url"]}" aria-label="Read {escape(p["title"], quote=True)}"><img src="{p["image"]}" alt="{escape(p["alt"], quote=True)}" loading="lazy"><span class="image-arrow" aria-hidden="true">↗</span></a>
 <div class="post-copy"><div class="post-meta"><span>{escape(p["category"])}</span><span>{escape(p["date"])}</span></div>
 <h2><a href="{p["url"]}">{escape(p["title"])}</a></h2><p>{escape(p["excerpt"])}</p>
 <div class="post-bottom"><span>{escape(p["reading"])}</span><a href="{p["url"]}">Read article <span aria-hidden="true">↗</span></a></div></div>
</article>''')
    page = '''<!doctype html>
<html lang="en" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0b0c0d">
<title>Writing &amp; Field Notes | Promit Mitra</title>
<meta name="description" content="Articles and practical perspectives on technology, operations, learning, healthcare, and digital transformation.">
<link rel="canonical" href="https://promit.qd.je/blogs/">
<meta property="og:type" content="website"><meta property="og:title" content="Writing &amp; Field Notes | Promit Mitra"><meta property="og:url" content="https://promit.qd.je/blogs/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/blog-index.css"><link rel="stylesheet" href="/assets/css/lenis.css"><script src="/assets/vendor/lenis.min.js" defer></script><script src="/assets/js/smooth-scroll.js" defer></script><script src="/assets/js/blog-index.js" defer></script></head><body>
<header class="index-nav"><a class="wordmark" href="/">promit<span>.</span></a><nav aria-label="Main navigation"><a href="/#about">About</a><a href="/#work">Selected work</a><a class="current" href="/blogs/">Writing</a><a href="/#contact">Contact</a></nav><a class="nav-back" href="/">Portfolio ↗</a></header>
<main><section class="intro-grid"><div class="intro-title"><p class="eyebrow"><span class="live-dot"></span> NOTES FROM THE WORK</p><h1><span class="title-blog">Blog</span> and<br><span class="title-lower">beyond<span class="title-period">.</span></span></h1><p class="intro-subtitle">Ideas, systems, and the details<br>that make work matter.</p></div>
<div class="intro-aside"><span class="section-index">01 / THE JOURNAL</span><p>A growing collection of practical perspectives on technology, digital transformation, learning, healthcare, and the systems people rely on.</p><div class="intro-rule"><span>INDEPENDENT NOTES</span><span>EST. 2026</span></div></div><div class="intro-ghost" aria-hidden="true">WRITING<br>IS THINKING.</div></section>
<section class="journal" aria-labelledby="journal-title"><div class="journal-top"><div><p class="eyebrow">THE ARCHIVE <span class="archive-count">/ __COUNT__ ENTRIES</span></p><h2 id="journal-title">Latest writing</h2></div>
<label class="search-box"><span aria-hidden="true">⌕</span><input id="post-search" type="search" placeholder="Search the journal" aria-label="Search articles"><kbd>/</kbd></label></div>
<div class="filter-row" aria-label="Filter articles">__FILTERS__</div><div class="post-list">__CARDS__</div><p class="empty-state" hidden>No articles match that search. Try another term or category.</p>
<div class="archive-footer"><span>YOU’VE REACHED THE CURRENT ARCHIVE</span><span>MORE NOTES TO COME ↗</span></div></section></main>
<footer class="index-footer"><a class="wordmark" href="/">promit<span>.</span></a><p>Research, ideas, and the work behind them.</p><a href="/#contact">Have a conversation ↗</a></footer></body></html>'''
    page = page.replace("__COUNT__", str(len(posts))).replace("__FILTERS__", chr(10).join(filters)).replace("__CARDS__", chr(10).join(cards))
    target = ROOT / "blogs" / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page, encoding="utf-8")
    print(f"Generated {target.relative_to(ROOT)} with {len(posts)} posts.")

if __name__ == "__main__":
    main()
