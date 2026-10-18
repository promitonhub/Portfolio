#!/usr/bin/env python3
# Generate sitemap.xml and sitemap_index.xml from canonical, indexable HTML pages.
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://promit.qd.je"
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)

def q(name):
    return f"{{{NS}}}{name}"

def url_for(path):
    try:
        html = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None
    if path.name.lower() == "404.html":
        return None
    if re.search(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', html, re.I):
        return None
    canonical = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)', html, re.I)
    if canonical:
        url = canonical.group(1).strip()
        return url if url == SITE + "/" or url.startswith(SITE + "/") else None
    rel = path.relative_to(ROOT).as_posix()
    if rel == "index.html":
        rel = ""
    elif rel.endswith("/index.html"):
        rel = rel[:-len("index.html")]
    return SITE + "/" + rel.lstrip("/")

def main():
    urls = set()
    for path in ROOT.rglob("*.html"):
        parts = path.relative_to(ROOT).parts
        if any(part.startswith(".") for part in parts):
            continue
        if any(part in {"node_modules", "vendor"} for part in parts):
            continue
        if path.name == "google3d7a67353e49ce02.html":
            continue
        url = url_for(path)
        if url:
            urls.add(url)
    if not urls:
        raise SystemExit("No indexable HTML pages found; refusing to write an empty sitemap.")
    urlset = ET.Element(q("urlset"))
    for url in sorted(urls):
        node = ET.SubElement(urlset, q("url"))
        ET.SubElement(node, q("loc")).text = url
    ET.indent(urlset, space="  ")
    (ROOT / "sitemap.xml").write_bytes(ET.tostring(urlset, encoding="utf-8", xml_declaration=True) + b"\n")
    index = ET.Element(q("sitemapindex"))
    sitemap = ET.SubElement(index, q("sitemap"))
    ET.SubElement(sitemap, q("loc")).text = SITE + "/sitemap.xml"
    ET.indent(index, space="  ")
    (ROOT / "sitemap_index.xml").write_bytes(ET.tostring(index, encoding="utf-8", xml_declaration=True) + b"\n")
    print(f"Generated sitemap.xml ({len(urls)} URLs) and sitemap_index.xml.")

if __name__ == "__main__":
    main()
