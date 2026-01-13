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
    """Extract title, date, and excerpt from markdown content with YAML frontmatter support"""
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

    # Get excerpt from first paragraph after title if not in frontmatter
    return title, date, content_start


def create_html_template(title, content, date=None):
    """Create complete HTML page with site styling"""
    date_str = date or "Recent"

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
            <p class="post-meta">{date_str}</p>
          </header>

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

    return html_content


def main():
    blog_dir = Path("blog")
    posts = []

    # Process each markdown file in blog subdirectories
    for post_dir in blog_dir.iterdir():
        if post_dir.is_dir() and post_dir.name != "__pycache__":
            md_file = post_dir / f"{post_dir.name}.md"
            if md_file.exists():
                print(f"Processing {md_file}")

                # Read markdown content
                with open(md_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Extract metadata
                title, date, content_start = extract_frontmatter(content)
                if not title:
                    title = post_dir.name.replace("-", " ").title()
                if not date:
                    # Use file modification time as fallback
                    date = datetime.fromtimestamp(md_file.stat().st_mtime).strftime(
                        "%B %d, %Y"
                    )

                # Convert markdown to HTML
                html_content = process_markdown_content(content, content_start)

                # Create full HTML page
                full_html = create_html_template(title, html_content, date)

                # Write HTML file
                html_file = post_dir / "index.html"
                with open(html_file, "w", encoding="utf-8") as f:
                    f.write(full_html)

                # Add to posts list for index
                posts.append(
                    {
                        "title": title,
                        "date": date,
                        "slug": post_dir.name,
                    }
                )

                print(f"Generated {html_file}")

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

    # Generate blog index
    blog_index = generate_blog_index(posts)
    with open(blog_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(blog_index)

    print(f"Generated blog index with {len(posts)} posts")

    # Update base index.html with blog posts
    base_index_path = Path("index.html")
    if base_index_path.exists():
        with open(base_index_path, "r", encoding="utf-8") as f:
            base_index_content = f.read()

        # Generate blog posts HTML for base index (with ./blog/ prefix)
        blog_posts_html = generate_blog_posts_html(posts, link_prefix="./blog/")

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
