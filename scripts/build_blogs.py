#!/usr/bin/env python3
"""Generate /blogs/<number>/index.html from matching BC<number>.txt and BT<number>.png."""
from pathlib import Path
from html import escape
import json, re

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "blogs/Blog_Content"
THUMBS = ROOT / "blogs/Blog_Thunbnails"
SITE = "https://promit.qd.je"

def parse(path):
    raw = path.read_text(encoding="utf-8")
    meta, body = {}, raw
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            item = re.match(r"^\s*([\w-]+)\s*:\s*(.*?)\s*$", line)
            if item:
                v = item.group(2).strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                meta[item.group(1).lower()] = v
        body = m.group(2)
    title = meta.get("title") or next((x.strip() for x in re.findall(r"(?m)^#\s+(.+)$", body)), path.stem)
    return meta, body, title

def main():
    import markdown
    files = sorted(CONTENT.glob("BC*.txt"), key=lambda p: int(re.search(r"\d+$", p.stem).group()) if re.search(r"\d+$", p.stem) else 999999)
    if not files:
        raise SystemExit("No BC<number>.txt files found.")
    for p in files:
        m = re.fullmatch(r"BC(\d+)", p.stem)
        if not m:
            continue
        n = int(m.group(1))
        img = THUMBS / f"BT{n}.png"
        if not img.is_file():
            raise SystemExit(f"Missing matching thumbnail: {img.relative_to(ROOT)}")
        meta, body, title = parse(p)
        category = meta.get("category", "Article")
        date = meta.get("date", "")
        excerpt = meta.get("excerpt", "")
        alt = meta.get("alt", title)
        url = f"{SITE}/blogs/{n}/"
        image_url = f"{SITE}/blogs/Blog_Thunbnails/BT{n}.png"
        description = excerpt or re.sub(r"\s+", " ", re.sub(r"[#>*_`]", "", body)).strip()[:220]
        html_body = markdown.markdown(body.strip(), extensions=["extra", "sane_lists", "smarty"], output_format="html5")
        jsonld = {
            "@context":"https://schema.org", "@type":"BlogPosting", "headline":title,
            "description":description, "image":image_url, "url":url,
            "datePublished":date, "author":{"@type":"Person","name":meta.get("author","Promit Mitra")}
        }
        page = """<!doctype html>
<html lang="en" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b0c0d">
<title>__TITLE__ | Promit Mitra</title>
<meta name="description" content="__DESC__"><meta name="author" content="__AUTHOR__">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="__URL__">
<meta property="og:type" content="article"><meta property="og:site_name" content="Promit Mitra">
<meta property="og:title" content="__TITLE__"><meta property="og:description" content="__DESC__">
<meta property="og:url" content="__URL__"><meta property="og:image" content="__IMAGE__"><meta property="og:image:alt" content="__ALT__">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="__TITLE__">
<meta name="twitter:description" content="__DESC__"><meta name="twitter:image" content="__IMAGE__">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/blog-page.css"><script src="/assets/js/blog-page.js" defer></script>
<script type="application/ld+json">__JSONLD__</script></head><body>
<header class="article-nav"><a class="wordmark" href="/">promit<span>.</span></a><a href="/#blog" class="back-link">← Back to portfolio</a></header>
<main><section class="article-hero" aria-label="Article cover"><img class="article-cover" src="/blogs/Blog_Thunbnails/BT__N__.png" alt="__ALT__" fetchpriority="high"><div class="cover-grain" aria-hidden="true"></div></section>
<article class="article-shell"><div class="article-meta"><span>__CATEGORY__</span>__DATE__ __READING__</div>
<h1 class="article-title" data-type-title>__TITLE__</h1>__DECK__
<div class="article-body">__BODY__</div></article></main>
<footer class="article-footer"><div><a class="wordmark" href="/">promit<span>.</span></a><p>Research, ideas, and the work behind them.</p></div>
<div class="footer-links"><a href="/#blog">More articles</a><a href="/">Portfolio home</a><a href="#top" data-back-top>Back to top ↑</a></div></footer></body></html>"""
        repl = {
            "__TITLE__":escape(title, quote=True), "__DESC__":escape(description, quote=True),
            "__AUTHOR__":escape(meta.get("author","Promit Mitra"), quote=True), "__URL__":url,
            "__IMAGE__":image_url, "__ALT__":escape(alt, quote=True), "__JSONLD__":json.dumps(jsonld, ensure_ascii=False),
            "__N__":str(n), "BT__N__.png":f"BT{n}.png", "__CATEGORY__":escape(category),
            "__DATE__":f"<span>{escape(date)}</span>" if date else "",
            "__READING__":f"<span>{escape(meta.get('reading_time',''))}</span>" if meta.get("reading_time") else "",
            "__DECK__":f'<p class="article-deck">{escape(excerpt)}</p>' if excerpt else "",
            "__BODY__":html_body,
        }
        for key, value in repl.items():
            page = page.replace(key, value)
        target = ROOT / "blogs" / str(n) / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding="utf-8")
        print(f"Generated {target.relative_to(ROOT)}")
    cname = ROOT / "CNAME"
    if not cname.exists():
        cname.write_text("promit.qd.je\n", encoding="utf-8")

if __name__ == "__main__":
    main()
