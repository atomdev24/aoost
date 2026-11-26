# Connect Claude to the aoost editor

The site has its own MCP server at `/mcp`. Once Claude is connected you can chat with it while the editor is open, and its edits appear on your canvas within about a second, highlighted, and on your undo stack as "Claude: …".

Everything Claude does changes the **draft** only. Nothing goes live until you press Publish, or tell Claude in so many words to publish.

## What you need

- The editor address: `https://alexoostendurp.com` (or the preview deployment `https://aoost-cms.aoost-cms.workers.dev`).
- The editor password (the `EDITOR_PASSWORD` you chose). Claude sends it as a bearer token.

## Claude Code (works today)

Run this once in a terminal, with your own URL and password:

```sh
claude mcp add --transport http aoost https://aoost-cms.aoost-cms.workers.dev/mcp \
  --header "Authorization: Bearer <your editor password>"
```

Check it with `claude mcp list` (it should say `aoost … connected`), then, inside Claude Code, `/mcp` shows the tools.

To remove it: `claude mcp remove aoost`.

## Your own Claude account (claude.ai, desktop and phone apps)

No server to run: the site signs Claude in with OAuth, the same way other connectors work.

1. In Claude: **Customize → Connectors → + → Add custom connector** (claude.ai/customize/connectors). On a Team or Enterprise plan an Owner adds it under Organization settings → Connectors first; then you press Connect.
2. Name it `aoost`, URL `https://alexoostendurp.com/mcp`. Leave the advanced OAuth fields empty.
3. Claude opens a "Connect Claude" page on the site. You're already signed in to the editor there
   (Cloudflare Access), so press **Allow**. On the password setup it asks for the editor password.
4. In a chat, turn the `aoost` connector on from the tools menu and ask away.

Claude acts as you: your team role applies to it. Each approval gives it a 1-hour key that it
renews by itself for up to 30 days; after that it asks you to Allow again.

Other MCP clients can still use a fixed header: `Authorization: Bearer <editor password>` on the
password setup.

## Seeing Claude work

- While Claude works, a **Claude pill** floats under the top bar with what it's doing ("Update
  About: one line…"), a thin moving line runs along the top of the window, and the block it is
  working on gets an orange ring and a small "Claude" tag on the canvas.
- When it stops, the pill turns green: "Finished · …" for a few seconds. ⌘Z undoes its changes.
- Claude calls `set_status` to say what it is about to do, so the pill appears before the first
  change, not only after.

## Tagging Claude on a section

Write a comment on the canvas and start it with **@Claude** ("@Claude make this calmer"). It
becomes a task. Claude doesn't watch the site on its own: in a Claude chat with the connector on,
say **"do my tagged tasks"**. Claude reads them (`get_claude_tasks`), shows its work in the
editor as above, and replies on each comment. To have it check every morning instead, ask Claude
for a scheduled task that does the same.

## Using it

1. Open the editor (`/admin`) on the page you want to work on. The green dot in the top bar means live sync is connected.
2. Click the thing you want to talk about. Claude can see which page is open, what is selected and whether you are on Mobile or Desktop.
3. Ask. For example:
   - "Make this image rounder and add a hard shadow."
   - "Add a three-column grid under the hero with these three images."
   - "On desktop only, make the headline centred and 720px wide."
   - "Create a Sketchbook page under Work from the gallery template and put it in the nav."
   - "Show me a screenshot of this page on mobile."
4. If you don't like a change, press ⌘Z. Claude's edits undo like your own.
5. When you are happy, press **Publish**, or say "publish it".

## What Claude can do

| Tool | What it does |
|---|---|
| `list_pages`, `get_page`, `get_site` | Read pages, theme tokens, navigation, global components, diary entries, playlists |
| `get_editor_context` | The page you have open, the selected element(s), the active breakpoint |
| `add_section`, `add_node` | Add a flow, grid or canvas section, or a component in a section |
| `update_node` | Change content, mobile style, frame fit, scroll effects (also sections and global components) |
| `set_responsive_override` | Set or reset desktop-only (or mobile) values |
| `move_node`, `delete_node` | Reorder, move between sections, delete |
| `create_page`, `update_page_settings` | New pages; title, URL (with redirect), status, search fields, nav, parent |
| `update_nav` | Add, change, move or remove nav items; nav behaviour |
| `upload_media_from_url` | Copy a file from a public https URL into the media library |
| `get_preview_screenshot` | A PNG of the draft page at 390px or 1440px |
| `publish` | Publish the draft. Claude is told to use this only when you explicitly ask |
| `get_claude_tasks` | Open comments that tag @Claude, with the block they're on |
| `set_status` | Show what Claude is doing in the editor's Claude pill, and on which blocks |

## Good to know

- **Screenshots need the editor open.** Your browser draws the picture and sends it back. Embedded players (YouTube, Spotify) show as labelled boxes and Google Fonts fall back to system fonts in the screenshot; your uploaded fonts and images are exact.
- **Selection is live.** If you click something else while Claude is working, "this" changes.
- **If Claude edits the page you are typing on at the same moment**, the newer change wins for that page. Your undo stack has both.
- **Invalid changes are refused.** Claude gets an error back and nothing changes (for example a URL that is already taken, or a link to a page that does not exist).
