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

def extract_frontmatter(content):
    """Extract title and date from markdown content"""
    lines = content.split('\n')
    title = None
    date = None
    excerpt = None

    # Extract title from first # heading
    for line in lines:
        if line.startswith('# '):
            title = line[2:].strip()
            break

    # Get excerpt from first paragraph after title
    content_lines = []
    found_title = False
    for line in lines:
        if line.startswith('# ') and not found_title:
            found_title = True
            continue
        if found_title and line.strip() and not line.startswith('#'):
            excerpt = line.strip()
            break

    return title, date, excerpt

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
  <link href="https://fonts.googleapis.com/css?family=JetBrains Mono" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>

<body>
  <canvas id="boids-canvas"></canvas>

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

  <script src="../../boids.js"></script>
</body>

</html>"""

def generate_blog_index(posts):
    """Generate the blog index page with all posts"""
    posts_html = ""
    for post in posts:
        posts_html += f"""            <article class="blog-post-preview">
              <h4><a href="{post['slug']}/index.html" class="project-link">{post['title']}</a></h4>
              <p class="post-date">{post['date']}</p>
              <p class="post-excerpt">{post['excerpt']}</p>
            </article>
"""

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

  <div class="text-container">
    <div class="content-box">
      <main>
        <div class="blog-content">
          <h3>blog</h3>
          <div class="blog-posts">
{posts_html}          </div>
          <div class="navigation">
            <a href="../index.html" class="reference-link">← back to home</a>
          </div>
        </div>
      </main>
    </div>
  </div>

  <script src="../boids.js"></script>
</body>

</html>"""

def process_markdown_content(content):
    """Process markdown content and fix links for HTML"""
    # Convert markdown to HTML (skip the title as it's already in the header)
    lines = content.split('\n')
    content_without_title = '\n'.join(lines[1:]) if lines[0].startswith('# ') else content

    md = markdown.Markdown(extensions=['fenced_code', 'codehilite'])
    html_content = md.convert(content_without_title)

    # Add proper link classes
    html_content = re.sub(r'<a href="([^"]*)">', r'<a href="\1" class="project-link">', html_content)

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
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Extract metadata
                title, date, excerpt = extract_frontmatter(content)
                if not title:
                    title = post_dir.name.replace('-', ' ').title()
                if not date:
                    # Use file modification time as fallback
                    date = datetime.fromtimestamp(md_file.stat().st_mtime).strftime("%B %d, %Y")
                if not excerpt:
                    excerpt = "Blog post"

                # Convert markdown to HTML
                html_content = process_markdown_content(content)

                # Create full HTML page
                full_html = create_html_template(title, html_content, date)

                # Write HTML file
                html_file = post_dir / "index.html"
                with open(html_file, 'w', encoding='utf-8') as f:
                    f.write(full_html)

                # Add to posts list for index
                posts.append({
                    'title': title,
                    'date': date,
                    'excerpt': excerpt,
                    'slug': post_dir.name
                })

                print(f"Generated {html_file}")

    # Sort posts by date (newest first)
    posts.sort(key=lambda x: x['date'], reverse=True)

    # Generate blog index
    blog_index = generate_blog_index(posts)
    with open(blog_dir / "index.html", 'w', encoding='utf-8') as f:
        f.write(blog_index)

    print(f"Generated blog index with {len(posts)} posts")

if __name__ == "__main__":
    main()