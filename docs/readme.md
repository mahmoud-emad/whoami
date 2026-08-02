# Documentation

The manual source. Chapters live in `content/` as Markdown and are read in filename order, which is
what the numeric prefixes are for.

## Reading it here

| Chapter | |
| --- | --- |
| 1 | [Introduction](content/01_introduction.md) |
| 2 | Getting started — [First run](content/02_getting_started/01_first_run.md) · [How configuration works](content/02_getting_started/02_configuration_model.md) |
| 3 | User guide — [Managing content](content/03_user_guide/01_managing_content.md) · [Writing a post](content/03_user_guide/02_writing_posts.md) · [Lists and books](content/03_user_guide/03_lists_and_books.md) · [Reactions, uploads and search](content/03_user_guide/04_reactions_uploads_search.md) · [Theming](content/03_user_guide/05_theming.md) · [Webring and Web Sign-In](content/03_user_guide/06_indieweb.md) |
| 4 | Developer guide — [Local development](content/04_developer_guide/01_local_development.md) |
| 5 | Reference — [Environment variables](content/05_reference/01_environment_variables.md) · [API](content/05_reference/02_api_reference.md) |
| 6 | Deployment — [Single server](content/06_deployment/01_single_server.md) · [Docker](content/06_deployment/02_docker.md) · [Reverse proxy](content/06_deployment/03_reverse_proxy.md) |
| 7 | Operations — [Backups](content/07_operations/01_backups.md) |

[OPEN_SOURCE_PLAN.md](OPEN_SOURCE_PLAN.md) sits outside `content/` on purpose — it is a record of
how this repository was made publishable, not part of the manual.

## Building it

`booklet.toml` is the manifest. With
[hero_doc_generator](https://forge.ourworld.tf/lhumina_code/hero_skills) installed:

```bash
hero_doc_generator check docs     # print the chapter order without building
hero_doc_generator build docs     # HTML, ebook, PDF and DOCX
```

Output lands in `~/Downloads/whoami-manual/`. Useful flags:

| Flag | Effect |
| --- | --- |
| `--format html` | One format only — build HTML first to check diagrams render |
| `--watch --open` | Rebuild on save and open the result |
| `--strict` | Fail on broken local links or missing images. Use this in CI. |
| `--out <DIR>` | Write somewhere other than `~/Downloads` |

The `ebook` format turns the `content/` subdirectories into a collapsible sidebar treeview, so the
folder names double as navigation labels.

## Writing conventions

- One `# H1` per file — it becomes the chapter title in every output format.
- Never skip a heading level. `#` then `##` then `###`. Check with `grep -n "^#" <file>`.
- A one- or two-sentence lead paragraph under the H1, before the first `##`.
- Numeric prefixes (`01_`, `02_`) set the order. Verify with `hero_doc_generator check docs`.
- Relative links between chapters, so they work both on the forge and in the built output.
- Mermaid for flows and sequences. Unsupported diagram types render as plain code blocks rather
  than failing the build, so check the HTML output.
