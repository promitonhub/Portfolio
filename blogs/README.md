# Blog post files

This is the portfolio's static-file blog source. Each post consists of a portrait PNG thumbnail and a Markdown article saved as a `.txt` file:

- `Blog_Thunbnails/BT1.png` pairs with `Blog_Content/BC1.txt`
- `Blog_Thunbnails/BT2.png` pairs with `Blog_Content/BC2.txt`
- Continue with matching numbers for subsequent posts.

Use consecutive numbering with no gaps. The homepage discovers pairs automatically and stops at the first missing pair. A post is shown only when both files exist. No manifest or HTML change is needed when a new numbered pair is added.

Thumbnail images should be PNGs in a 3:4 portrait aspect ratio. Article files are plain-text `.txt` files whose contents use Markdown. Optional front matter is supported at the top of an article:

```text
---
title: A clear article title
category: ACCOUNT RESEARCH
date: 2026-10-17
excerpt: A concise one-sentence summary.
alt: A useful description of the thumbnail.
---

# A clear article title

Write the article in Markdown below this heading.
```

Supported Markdown includes headings, paragraphs, bold and italic text, inline and fenced code, blockquotes, ordered and unordered lists, horizontal rules, tables, and safe `https://`, `http://`, or `mailto:` links. Raw HTML is escaped rather than executed.
