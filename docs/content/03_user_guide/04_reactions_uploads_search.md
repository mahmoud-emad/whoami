# Reactions, Uploads and Search

The three features that involve visitors rather than only the owner, plus the guestbook's anti-bot
check.

## Reactions

Every post carries an up and a down vote, open to anyone. There are no accounts and no replies.

A voter is identified by a salted hash of their IP address and the post id, so one reader gets one
vote per post and can change it or take it back by clicking the same arrow again. The salt is
generated per install on the first vote and kept in `security.voteSalt`; the hash cannot be reversed
to an address, and cannot be correlated across posts.

This is a courtesy limit rather than a guarantee — someone determined to vote twice can change
address — which is the right trade against making a reader sign up to say they liked something.
Writes are throttled to 20 per minute per address.

## Uploads

Images and PDFs up to 5 MB, in JPEG, PNG, GIF or PDF. The type and size limits are enforced on the
server. Files land in the uploads directory and are served publicly at `/uploads/<filename>`, so an
`/uploads/...` path works anywhere the dashboard asks for an image URL, including the preview image
and the favicon.

## Search

`GET /api/search?q=...` is public and reads two settings. `configuration.enableSearch` turns it off
entirely, and `configuration.searchModels` decides which of projects, articles, posts and guestbooks
are looked at. Both live in the Configure Search engine tab.

Only whitelisted fields are matched, so a query can never reach a field that was not meant to be
public.

## Guestbook anti-bot

The guestbook asks a question you choose. The question is public and is sent to the form. The answer
is stored server side only, is stripped from every public response, and is checked in the POST
handler after trimming and lowercasing.

Nothing in the browser bundle knows the answer, which is the whole point. Leave the answer empty to
accept every submission.

## See also

- [API reference](../05_reference/02_api_reference.md)
- [Environment variables](../05_reference/01_environment_variables.md)
