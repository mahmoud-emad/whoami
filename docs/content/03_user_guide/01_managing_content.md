# Managing Content

Content is edited on the page it appears on. The dashboard holds the settings that shape the whole
site and have no place on a public page.

## In place, while signed in

Sign in at `/admin`, then browse the site as normal. Your avatar in the navbar grows a sign out
button, and the owner controls appear on the pages themselves:

- **Home**: the intro copy, the problem solving blurb, the experience entries, and the project and
  article lists — each with add, edit, reorder, hide and delete where it makes sense.
- **Projects**: a "New project" button above the list, and edit and delete icons on each card.
- **Blog and articles**: edit and delete on each entry, and a create button on the listing. Posts
  are written in the markdown editor.
- **Guestbook**: delete on each entry.
- **Contact**: add, edit, reorder and delete contact channels, plus the page heading and intro.
- **More**: add, edit and delete the cards and the small link list, plus the page copy.

Entries you have hidden stay visible to you, dimmed and marked `HIDDEN`, so you can bring one back
from the page it lives on rather than hunting for it in a form.

Delete is two steps. The trash icon arms the action, a small "Delete?" confirmation appears next to
it, and it disarms itself after a few seconds if you do nothing.

Nothing owner-only is visible to a signed out visitor, and the buttons are a convenience rather than
a security boundary. The backend re-checks the token on every write regardless of what the interface
offered.

## The dashboard

`/admin-dashboard` holds the site-wide settings. On a phone the tab rail collapses into a "Section"
dropdown.

| Tab | What it owns |
| --- | --- |
| Branding | Display name, handle, logo, copyright line, navigation items |
| Socials | Email, Signal, GitHub, LinkedIn, X, timezone |
| Sections | Heading, emoji, intro, visibility and order of each home page section |
| Pages | Heading and intro copy for Contact, Projects, Blog, Guestbook, Search and the 404 page |
| Appearance | Default theme and both colour palettes, with the contrast readout |
| Site meta | Browser tab title, description, canonical URL, preview image, favicon, X handle, and the webring |
| Uploads | Every uploaded file, with copy URL and delete |
| Configure Search engine | Whether search is on, and which collections it looks at |
| Site Settings | GitHub link, the dark/light toggle switch, whether the dashboard is reachable, and changing your signature |

## See also

- [Writing a post](02_writing_posts.md)
- [Lists and books](03_lists_and_books.md)
