#!/usr/bin/env python3
"""Build every individual blog article page and the /blogs/ archive index."""

from build_blogs import main as build_article_pages
from build_blog_index import main as build_archive_index


def main():
    # Generate /blogs/<number>/index.html for each matching BC<number>.txt
    # and BT<number>.png pair.
    build_article_pages()

    # Generate /blogs/index.html from the same source content.
    build_archive_index()


if __name__ == "__main__":
    main()
