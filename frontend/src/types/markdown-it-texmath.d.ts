/**
 * `markdown-it-texmath` ships no types and has no @types package. It is only ever used as a
 * markdown-it plugin, so the plugin signature is all this needs to describe.
 */
declare module 'markdown-it-texmath' {
  import type MarkdownIt from 'markdown-it';

  interface TexmathOptions {
    /** The KaTeX module. Typed loosely because it arrives from a dynamic import. */
    engine: unknown;
    /** Which delimiter set to recognise: 'dollars', 'brackets', 'gitlab', … */
    delimiters?: string | string[];
    katexOptions?: Record<string, unknown>;
  }

  const texmath: (_md: MarkdownIt, _options?: TexmathOptions) => void;
  export default texmath;
}
