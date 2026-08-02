# Writing a Post

Posts are markdown. The editor has a Write/Preview pair, and the preview is the exact renderer the
published page uses, so what you see is what a reader gets.

## What the renderer supports

| Feature | How |
| --- | --- |
| Tables, footnotes, task lists | Standard markdown |
| Syntax-highlighted code | ` ```ts ` and friends |
| Diagrams | ` ```mermaid ` — flowcharts, sequence, class, and the rest |
| Maths | `$inline$` and `$$display$$`, rendered with KaTeX |
| Images | Drag one in, paste from the clipboard, or use the image button |

## Why the heavy libraries load late

Mermaid, KaTeX and the syntax highlighter are each about half a megabyte, so none of them is in the
main bundle. A post downloads only what it actually uses, and a post with no diagrams and no maths
downloads neither. Diagrams follow the site's palette and are redrawn when the theme changes.

## Images

Images work the way they do on GitHub. Drop a file on the editor, paste a screenshot, or press the
image button; an `![Uploading …]()` placeholder appears at the cursor and is replaced with the real
`/uploads/...` URL when the upload finishes.

They are uploaded, not inlined. The old editor turned every screenshot into a base64 blob inside the
post body, which every reader then downloaded.

## See also

- [Uploads, reactions and search](04_reactions_uploads_search.md)
- [Managing content](01_managing_content.md)
