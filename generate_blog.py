#!/usr/bin/env python3
"""
Static blog generator for kh3dron.net
Converts markdown files to HTML using the site's styling
"""

import os
import re
from pathlib import Path
from datetime import datetime
import markdown
from markdown.extensions import codehilite, fenced_code
import yaml


def extract_frontmatter(content):
    """Extract title and date from markdown content with YAML frontmatter support"""
    lines = content.split("\n")
    title = None
    date = None
    content_start = 0

    # Check for YAML frontmatter (between --- delimiters)
    if lines and lines[0].strip() == "---":
        try:
            # Find the closing ---
            end_idx = lines[1:].index("---") + 1
            frontmatter_text = "\n".join(lines[1:end_idx])
            frontmatter = yaml.safe_load(frontmatter_text)

            if frontmatter:
                title = frontmatter.get("title")
                date = frontmatter.get("date")

            content_start = end_idx + 1
        except (ValueError, yaml.YAMLError):
            # No valid frontmatter found, continue with regular parsing
            pass

    # If no title found in frontmatter, extract from first # heading
    if not title:
        for line in lines[content_start:]:
            if line.startswith("# "):
                title = line[2:].strip()
                break

    return title, date, content_start


def generate_table_of_contents(content):
    """Generate table of contents from markdown headings"""
    lines = content.split("\n")
    toc_items = []

    for line in lines:
        if line.startswith("## "):
            heading = line[3:].strip()
            anchor = heading.lower().replace(" ", "-").replace("'", "")
            # Remove special characters
            anchor = re.sub(r'[^\w\-]', '', anchor)
            toc_items.append(f'<li><a href="#{anchor}" class="toc-link">{heading}</a></li>')

    if not toc_items:
        return ""

    toc_html = '<nav class="table-of-contents">\n'
    toc_html += '  <h4>Contents</h4>\n'
    toc_html += '  <ul>\n'
    toc_html += '\n'.join(f'    {item}' for item in toc_items)
    toc_html += '\n  </ul>\n'
    toc_html += '</nav>\n'

    return toc_html


def create_html_template(title, content, date=None, toc=None):
    """Create complete HTML page with site styling"""
    date_str = date or "Recent"

    # Generate TOC HTML
    toc_html = toc if toc else ""

    return f"""<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - kh3dron.net</title>
  <link rel="stylesheet" href="../../css/styles.css">
  <link rel="stylesheet" href="../../css/blog.css">
  <link href="https://fonts.googleapis.com/css?family=JetBrains Mono" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>

<body>
  <canvas id="boids-canvas"></canvas>

  <!-- Theme toggle button -->
  <button class="theme-toggle" onclick="toggleTheme()" id="theme-toggle-btn">dark</button>

  <div class="text-container">
    <div class="content-box">
      <main>
        <article class="blog-post">
          <header class="post-header">
            <h1>{title}</h1>
            <div class="post-meta-container">
              <p class="post-meta">{date_str}</p>
            </div>
          </header>

          {toc_html}

          <div class="post-content">
            {content}
          </div>

          <div class="navigation">
            <a href="../index.html" class="reference-link">← back to blog</a>
            <a href="../../index.html" class="reference-link">← back to home</a>
          </div>
        </article>
      </main>
    </div>
  </div>

  <script src="../../theme.js"></script>
  <script src="../../boids.js"></script>
</body>

</html>"""


def format_date_month_year(date_str):
    """Format date string to 'Month Year' format (e.g., 'November 2025')"""
    if not date_str:
        return ""
    try:
        # Try parsing formats like "September 15, 2025" or "November 03, 2025"
        dt = datetime.strptime(date_str, "%B %d, %Y")
        return dt.strftime("%B %Y")
    except ValueError:
        # If parsing fails, try to extract month and year from the string
        # This handles edge cases
        return date_str


def generate_blog_posts_html(posts, link_prefix=""):
    """Generate HTML for blog posts list"""
    posts_html = ""
    for post in posts:
        date_formatted = format_date_month_year(post["date"])
        link = f"{link_prefix}{post['slug']}/index.html"

        # Use correct indentation: 14 spaces for <li>, 16 for <a> and <span>
        posts_html += f"""              <li class="blog-post-item">
                <a href="{link}" class="blog-post-title">{post['title']}</a>
                <span class="blog-post-date">{date_formatted}</span>
              </li>
"""
    return posts_html


def generate_blog_index(posts):
    """Generate the blog index page with all posts"""
    posts_html = generate_blog_posts_html(posts)

    return f"""<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>kh3dron.net - blog</title>
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/blog.css">
  <link href="https://fonts.googleapis.com/css?family=JetBrains Mono" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>

<body>
  <canvas id="boids-canvas"></canvas>

  <!-- Theme toggle button -->
  <button class="theme-toggle" onclick="toggleTheme()" id="theme-toggle-btn">dark</button>

  <div class="text-container">
    <div class="content-box">
      <main>
        <div class="blog-content">
          <h3>blog</h3>
          <ul class="blog-posts">
{posts_html}          </ul>
          <div class="navigation">
            <a href="../index.html" class="reference-link">← back to home</a>
          </div>
        </div>
      </main>
    </div>
  </div>

  <script src="../theme.js"></script>
  <script src="../boids.js"></script>
</body>

</html>"""


def process_markdown_content(content, content_start=0):
    """Process markdown content and fix links for HTML"""
    # Convert markdown to HTML (skip frontmatter and title)
    lines = content.split("\n")

    # Skip frontmatter if present
    actual_content_start = content_start
    for i in range(content_start, len(lines)):
        if lines[i].startswith("# "):
            actual_content_start = i + 1
            break

    content_without_title = "\n".join(lines[actual_content_start:])

    md = markdown.Markdown(extensions=["fenced_code", "codehilite", "tables"])
    html_content = md.convert(content_without_title)

    # Add proper link classes
    html_content = re.sub(
        r'<a href="([^"]*)">', r'<a href="\1" class="project-link">', html_content
    )

    # Add IDs to h2 headings for table of contents
    def add_heading_id(match):
        heading_text = match.group(1)
        heading_id = heading_text.lower().replace(" ", "-").replace("'", "")
        # Remove special characters
        heading_id = re.sub(r'[^\w\-]', '', heading_id)
        return f'<h2 id="{heading_id}">{heading_text}</h2>'

    html_content = re.sub(r'<h2>([^<]+)</h2>', add_heading_id, html_content)

    return html_content


def main():
    blog_dir = Path("blog")
    posts = []

    # First pass: collect all posts metadata from numbered .md files
    for md_file in sorted(blog_dir.glob("*.md")):
        # Only process files that are numbers (e.g., 1.md, 2.md, etc.)
        if md_file.stem.isdigit():
            # Read markdown content
            with open(md_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Extract metadata
            title, date, content_start = extract_frontmatter(content)
            if not title:
                title = f"Post {md_file.stem}"
            if not date:
                # Use file modification time as fallback
                date = datetime.fromtimestamp(md_file.stat().st_mtime).strftime(
                    "%B %d, %Y"
                )

            # Create output directory
            post_dir = blog_dir / md_file.stem
            post_dir.mkdir(exist_ok=True)

            # Add to posts list
            posts.append(
                {
                    "title": title,
                    "date": date,
                    "slug": md_file.stem,
                    "content": content,
                    "content_start": content_start,
                    "md_file": md_file,
                    "post_dir": post_dir,
                }
            )

    # Sort posts by date (newest first)
    def parse_date(date_str):
        """Parse date string to datetime for sorting"""
        if not date_str:
            return datetime.min
        try:
            # Try parsing formats like "September 15, 2025" or "November 03, 2025"
            return datetime.strptime(date_str, "%B %d, %Y")
        except ValueError:
            # If parsing fails, return min date to push to end
            return datetime.min

    posts.sort(key=lambda x: parse_date(x["date"]), reverse=True)

    # Second pass: generate HTML
    for i, post in enumerate(posts):
        print(f"Processing {post['md_file']}")

        # Convert markdown to HTML
        html_content = process_markdown_content(post["content"], post["content_start"])

        # Generate table of contents
        toc = generate_table_of_contents(post["content"])

        # Create full HTML page
        full_html = create_html_template(
            post["title"],
            html_content,
            post["date"],
            toc,
        )

        # Write HTML file
        html_file = post["post_dir"] / "index.html"
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(full_html)

        print(f"Generated {html_file}")

    # Generate blog index (simplify posts data for index)
    posts_for_index = [
        {
            "title": p["title"],
            "date": p["date"],
            "slug": p["slug"],
        }
        for p in posts
    ]

    blog_index = generate_blog_index(posts_for_index)
    with open(blog_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(blog_index)

    print(f"Generated blog index with {len(posts)} posts")

    # Update base index.html with blog posts
    base_index_path = Path("index.html")
    if base_index_path.exists():
        with open(base_index_path, "r", encoding="utf-8") as f:
            base_index_content = f.read()

        # Generate blog posts HTML for base index (with ./blog/ prefix)
        blog_posts_html = generate_blog_posts_html(posts_for_index, link_prefix="./blog/")

        # Find and replace the blog posts list in the essays section
        # Match the <ul class="blog-posts">...</ul> within the essays-content div
        pattern = r'(<div id="essays-content" class="collapsible-content">\s*<ul class="blog-posts">).*?(</ul>\s*</div>)'
        replacement = r"\1\n" + blog_posts_html + r"            \2"

        updated_content = re.sub(
            pattern, replacement, base_index_content, flags=re.DOTALL
        )

        with open(base_index_path, "w", encoding="utf-8") as f:
            f.write(updated_content)

        print(f"Updated base index.html with {len(posts)} posts")


if __name__ == "__main__":
    main()
