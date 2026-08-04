# kh3dron.net

welcome to my web site

- writing new posts:
  - write to blog/$title/$title.md
  - run generator.py
  - commit to main

## Design

US Graphics Company / industrial design language. Press run is fixed and lives in
the `:root` block of `css/styles.css`:

| Token | Value | Role |
|---|---|---|
| `--paper` | `#f4efe2` | Stock: manila. Page background |
| `--ink` | `#111` | Primary ink. Body text, borders, table cells |
| `--ink-2` | `#0f6f7a` | Second ink: teal. Rules, links, table headers, nav only |
| `--mono` | `"Berkeley Mono", ui-monospace, "SF Mono", Menlo, monospace` | One typeface everywhere |

LIMIT: second ink never marks state and never fills a button. Semantic accents
(red/gold/green/blue) are unused on this site; add them only for state.

To change stock, edit `--paper` and the two derived tints `--paper-alt` /
`--paper-alt2` (used for code blocks and table striping). Other stocks: bright
white `#fdfdfd`, blueprint `#e8eef4`, greenbar `#e9f0e7`, newsprint `#f2f0eb`.
