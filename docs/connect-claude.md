# Connect Claude to the aoost editor

The site has its own MCP server at `/mcp`. Once Claude is connected you can chat with it while the editor is open, and its edits appear on your canvas within about a second, highlighted, and on your undo stack as "Claude: …".

Everything Claude does changes the **draft** only. Nothing goes live until you press Publish, or tell Claude in so many words to publish.

## What you need

- The editor's address: `https://<preview>.workers.dev` (see the README for the current preview URL).
- The editor password (the `EDITOR_PASSWORD` you chose). Claude sends it as a bearer token.

## Claude Code (works today)

Run this once in a terminal, with your own URL and password:

```sh
claude mcp add --transport http aoost https://<preview>.workers.dev/mcp \
  --header "Authorization: Bearer <your editor password>"
```

Check it with `claude mcp list` (it should say `aoost … connected`), then, inside Claude Code, `/mcp` shows the tools.

To remove it: `claude mcp remove aoost`.

## Claude on the web or desktop app

The connector dialog in claude.ai (Settings → Connectors → Add custom connector) signs in with OAuth and cannot send a fixed password header, so it does not work with the password setup. It becomes possible after the planned switch to Cloudflare Access (`docs/auth.md`), which puts a proper sign-in in front of `/mcp`. That step is on the list for after this run; check then whether the claude.ai dialog accepts the Access sign-in.

Any other MCP client that lets you set an `Authorization` header works the same way as Claude Code: URL `https://<preview>.workers.dev/mcp`, transport "streamable HTTP", header `Authorization: Bearer <password>`.

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

## Good to know

- **Screenshots need the editor open.** Your browser draws the picture and sends it back. Embedded players (YouTube, Spotify) show as labelled boxes and Google Fonts fall back to system fonts in the screenshot; your uploaded fonts and images are exact.
- **Selection is live.** If you click something else while Claude is working, "this" changes.
- **If Claude edits the page you are typing on at the same moment**, the newer change wins for that page. Your undo stack has both.
- **Invalid changes are refused.** Claude gets an error back and nothing changes (for example a URL that is already taken, or a link to a page that does not exist).
