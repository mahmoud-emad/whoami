<template>
  <!--
    markdown-it runs with raw HTML disabled and the result goes through DOMPurify, so this v-html
    is fed markup the renderer itself produced rather than whatever was in the post body.
  -->
  <div ref="root" class="md" v-html="html"></div>
</template>

<script lang="ts">
/**
 * Markdown renderer for posts.
 *
 * Replaces `vue3-markdown`'s viewer, which rendered plain CommonMark and nothing else. A post can
 * now carry tables, images, syntax-highlighted code, LaTeX and Mermaid diagrams.
 *
 * Weight is why this is hand-rolled rather than one big plugin stack. Mermaid is around half a
 * megabyte and KaTeX is not much smaller, and most posts use neither, so each is a dynamic import
 * fired only when the body actually contains one. A post with no maths and no diagrams downloads
 * neither, and the highlighter arrives only with the first fenced code block.
 */
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
// The default export is the constructor; `MarkdownIt` itself is the instance TYPE, exported
// separately. Importing only the default and using it as a type is the mistake this names away.
import MarkdownItCtor, { type MarkdownIt } from 'markdown-it';
import DOMPurify from 'dompurify';
import { useTheme } from 'vuetify';

/** Fenced blocks tagged `mermaid` are diagrams, not code; everything else goes to the highlighter. */
const MERMAID_LANG = 'mermaid';

/** `$$…$$`, `$…$`, and the `\( \)` / `\[ \]` forms LaTeX users type out of habit. */
const HAS_MATH = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/;
const HAS_MERMAID = /^[ \t]*```[ \t]*mermaid\b/m;
const HAS_CODE = /^[ \t]*```/m;

/**
 * Loaded once per page and reused. Module scope rather than component state, so a listing showing
 * ten posts imports each library at most once.
 */
let hljsPromise: Promise<typeof import('highlight.js').default> | null = null;
/** A markdown-it plugin. texmath ships no types, so this is the shape we hold it as. */
type TexmathPlugin = (_md: MarkdownIt, _options?: Record<string, unknown>) => void;
let mathPromise: Promise<{ katex: unknown, texmath: TexmathPlugin }> | null = null;
let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;

/**
 * Counter for mermaid's render ids, at module scope rather than per component.
 *
 * `mermaid.render(id, ...)` puts a scratch element in the document under that id while it
 * measures the diagram. The id therefore has to be unique across every instance on the page, not
 * just within one: the blog renders each post through its own MarkdownView, so two instances
 * counting from zero hand mermaid the same id and their scratch elements collide — both diagrams
 * come out merged into one SVG. Only visible once two posts on a page each contain a diagram.
 */
let mermaidRenderId = 0;

const loadHljs = () => (hljsPromise ??= import('highlight.js').then((m) => m.default));
const loadMermaid = () => (mermaidPromise ??= import('mermaid').then((m) => m.default));
const loadMath = () =>
  (mathPromise ??= Promise.all([
    import('katex'),
    import('markdown-it-texmath'),
    import('katex/dist/katex.min.css'),
  ]).then(([katexModule, texmathModule]) => ({
    katex: (katexModule as { default?: unknown }).default ?? katexModule,
    texmath: ((texmathModule as { default?: unknown }).default ?? texmathModule) as TexmathPlugin,
  })));

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (value: string): string => escapeHtml(value).replace(/"/g, '&quot;');

export default defineComponent({
  name: 'MarkdownView',
  props: {
    content: { type: String, default: '' },
  },
  setup(props) {
    const root = ref<HTMLElement | null>(null);
    const theme = useTheme();

    // Async upgrades. Each starts null, and the renderer is rebuilt once one arrives.
    const hljs = ref<Awaited<ReturnType<typeof loadHljs>> | null>(null);
    const math = ref<{ katex: unknown, texmath: TexmathPlugin } | null>(null);

    /**
     * A Mermaid block is emitted as a <pre> holding its source as text, and swapped for an SVG
     * after mount — mermaid's API is async, so it cannot run inside markdown-it's synchronous
     * pass. Keeping the source as text rather than in a `data-` attribute is deliberate: DOMPurify
     * strips the attribute, and a diagram whose source had been sanitised away renders as nothing
     * at all. Text also means a diagram that fails to parse degrades to what the author wrote.
     */
    const buildRenderer = (): MarkdownIt => {
      const parser = new MarkdownItCtor({
        // The body is owner-authored, but markdown covers everything a post needs and there is no
        // reason to widen what a compromised session could inject.
        html: false,
        linkify: true,
        typographer: true,
        highlight: (code, lang) => {
          if (lang === MERMAID_LANG) {
            return `<pre class="md-mermaid">${escapeHtml(code)}</pre>`;
          }
          const engine = hljs.value;
          if (engine && lang && engine.getLanguage(lang)) {
            try {
              const out = engine.highlight(code, { language: lang, ignoreIllegals: true }).value;
              return `<pre class="md-code hljs"><code class="language-${escapeAttr(lang)}">${out}</code></pre>`;
            } catch {
              // Fall through to the plain rendering below.
            }
          }
          return `<pre class="md-code"><code>${escapeHtml(code)}</code></pre>`;
        },
      });

      // External links open in a new tab and disown the opener. Same-origin links do not, so
      // internal navigation still feels like one site.
      const defaultLinkOpen =
        parser.renderer.rules.link_open ||
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
      parser.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = String(tokens[idx].attrGet('href') ?? '');
        if (/^https?:\/\//i.test(href)) {
          tokens[idx].attrSet('target', '_blank');
          tokens[idx].attrSet('rel', 'noopener noreferrer');
        }
        return defaultLinkOpen(tokens, idx, options, env, self);
      };

      const defaultImage =
        parser.renderer.rules.image ||
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
      parser.renderer.rules.image = (tokens, idx, options, env, self) => {
        tokens[idx].attrSet('loading', 'lazy');
        tokens[idx].attrSet('decoding', 'async');
        return defaultImage(tokens, idx, options, env, self);
      };

      // texmath owns the delimiters, KaTeX does the typesetting. Registered only once both are in
      // memory, so a post without maths never pays for either.
      if (math.value) {
        parser.use(math.value.texmath, {
          engine: math.value.katex,
          delimiters: ['dollars', 'brackets'],
          katexOptions: { throwOnError: false, output: 'html' },
        });
      }

      return parser;
    };

    // Rebuilt whenever an async upgrade lands, which is what re-runs `html` below.
    const renderer = ref<MarkdownIt>(buildRenderer());

    const html = computed(() => {
      const source = props.content || '';
      if (!source.trim()) return '';
      return DOMPurify.sanitize(renderer.value.render(source), {
        ADD_ATTR: ['target', 'loading', 'decoding'],
      });
    });

    /** Pull in whatever this particular body needs, then re-render with it. */
    const ensureLibraries = async () => {
      const source = props.content || '';
      const jobs: Promise<unknown>[] = [];

      if (!hljs.value && HAS_CODE.test(source)) {
        jobs.push(loadHljs().then((engine) => { hljs.value = engine; }));
      }
      if (!math.value && HAS_MATH.test(source)) {
        jobs.push(loadMath().then((loaded) => { math.value = loaded; }));
      }
      if (!jobs.length) return;

      // A library that will not load must not take the post with it: the plain rendering is
      // already on screen and stays there.
      await Promise.all(jobs).catch(() => undefined);
      renderer.value = buildRenderer();
    };

    /**
     * Swap each Mermaid block for its rendered SVG.
     *
     * The <pre> carries the source as text; the figure that replaces it gets a `data-src`, which
     * is safe because that element is built here rather than passed through the sanitiser. Either
     * way a theme change can redraw from the DOM, which it has to: mermaid bakes its colours into
     * the SVG at render time, so a diagram drawn in the dark theme stays dark after a switch.
     */
    let renderToken = 0;
    const renderMermaid = async () => {
      const host = root.value;
      if (!host) return;
      const blocks = Array.from(
        host.querySelectorAll<HTMLElement>('pre.md-mermaid, .md-diagram[data-src]')
      );
      if (!blocks.length) return;

      const token = ++renderToken;
      const mermaid = await loadMermaid().catch(() => null);
      // A newer render (theme switch, new content, unmount) started while this one was loading.
      if (!mermaid || token !== renderToken) return;

      // 'base' plus explicit variables rather than the stock 'default'/'dark' themes: those ship a
      // lavender palette that has nothing to do with this site, and a diagram is part of the page,
      // not a screenshot pasted into it.
      const themeToken = (name: string, fallback: string): string => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(`--v-theme-${name}`).trim();
        return raw ? `rgb(${raw})` : fallback;
      };
      const dark = theme.global.current.value.dark;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'inherit',
        themeVariables: {
          background: 'transparent',
          primaryColor: themeToken('form', dark ? '#1A1613' : '#F7F4EF'),
          primaryTextColor: themeToken('text-color', dark ? '#F2EDE7' : '#1A1613'),
          primaryBorderColor: themeToken('border-color', dark ? '#403830' : '#D9D1C5'),
          lineColor: themeToken('gray-color', dark ? '#A79E95' : '#6B6259'),
          textColor: themeToken('text-color', dark ? '#F2EDE7' : '#1A1613'),
          mainBkg: themeToken('form', dark ? '#1A1613' : '#F7F4EF'),
          nodeBorder: themeToken('border-color', dark ? '#403830' : '#D9D1C5'),
        },
        // Mermaid puts node labels in a <foreignObject> by default, and DOMPurify's SVG profile
        // strips that tag — which drew every box correctly and every label not at all. With HTML
        // labels off the text is real <text>/<tspan>, which survives sanitising. `<br/>` inside a
        // label still works; mermaid turns it into a second tspan.
        htmlLabels: false,
        flowchart: { htmlLabels: false },
      });

      for (const block of blocks) {
        const source = block.getAttribute('data-src') ?? block.textContent ?? '';
        try {
          const { svg } = await mermaid.render(`md-mermaid-${(mermaidRenderId += 1)}`, source);
          if (token !== renderToken) return;
          const figure = document.createElement('div');
          figure.className = 'md-diagram';
          figure.setAttribute('data-src', source);
          figure.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
          block.replaceWith(figure);
        } catch {
          // Leave the <pre> alone. A diagram with a syntax error then reads as the source the
          // author typed, which is the most useful thing to show them.
          block.classList.add('md-mermaid--failed');
        }
      }
    };

    const rerender = async () => {
      await ensureLibraries();
      await nextTick();
      await renderMermaid();
    };

    onMounted(() => { void rerender(); });
    watch(() => props.content, () => { void rerender(); });
    watch(
      () => theme.global.current.value.dark,
      () => {
        if (HAS_MERMAID.test(props.content || '')) void renderMermaid();
      }
    );
    onBeforeUnmount(() => { renderToken += 1; });

    return { root, html };
  },
});
</script>

<style scoped>
/* Prose. */
.md {
  color: rgb(var(--v-theme-text-color));
  line-height: 1.75;
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4) {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: rgb(var(--v-theme-text-color));
  margin: 1.8rem 0 0.7rem !important;
}

.md :deep(h1) { font-size: 1.5rem; }
.md :deep(h2) { font-size: 1.25rem; }
.md :deep(h3) { font-size: 1.08rem; }
.md :deep(h4) { font-size: 1rem; }
.md :deep(> :first-child) { margin-top: 0 !important; }

.md :deep(p) { margin: 0 0 1rem !important; }

.md :deep(a) {
  color: rgb(var(--v-theme-link-color));
  text-decoration: underline;
  text-underline-offset: 2px;
}

.md :deep(a:hover) { color: rgb(var(--v-theme-link-hover-color)); }

.md :deep(ul),
.md :deep(ol) {
  margin: 0 0 1rem !important;
  padding-left: 1.35rem !important;
}

.md :deep(li) { margin-bottom: 0.35rem; }

.md :deep(blockquote) {
  margin: 0 0 1rem !important;
  padding: 0.2rem 0 0.2rem 1rem !important;
  border-left: 3px solid rgb(var(--v-theme-link-hover-color));
  color: rgb(var(--v-theme-gray-color));
}

.md :deep(hr) {
  border: 0;
  border-top: 1px solid rgb(var(--v-theme-border-color));
  margin: 2rem 0;
}

/* Images never widen the column, and carry the same hairline as the cards. */
.md :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.2rem 0;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 6px;
}

/* Inline code reads as a label; a block reads as a quote from a file. */
.md :deep(code) {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.88em;
  padding: 0.12em 0.36em;
  border-radius: 4px;
  background: rgb(var(--v-theme-form));
}

.md :deep(pre) {
  margin: 0 0 1.2rem !important;
  padding: 0.9rem 1rem !important;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 6px;
  background: rgb(var(--v-theme-form));
  /* Long lines scroll inside the block instead of widening the page. */
  overflow-x: auto;
}

.md :deep(pre code) {
  padding: 0;
  background: none;
  font-size: 0.85rem;
  line-height: 1.6;
}

/* Tables scroll in their own right on a phone rather than pushing the page sideways. */
.md :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0 0 1.2rem;
  font-size: 0.94rem;
}

.md :deep(th),
.md :deep(td) {
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.md :deep(th) {
  font-weight: 600;
  white-space: nowrap;
}

/* Diagrams are centred and allowed to scroll, because a wide flowchart is common. */
.md :deep(.md-diagram) {
  margin: 1.4rem 0;
  overflow-x: auto;
  text-align: center;
}

.md :deep(.md-diagram svg) {
  max-width: 100%;
  height: auto;
}

/* A diagram that would not parse keeps its source visible and says why. */
.md :deep(.md-mermaid--failed)::before {
  content: 'Diagram could not be drawn. Showing the source:';
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: rgb(var(--v-theme-gray-color));
}

/* Long formulae scroll rather than overflow. */
.md :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2rem 0;
}
</style>
