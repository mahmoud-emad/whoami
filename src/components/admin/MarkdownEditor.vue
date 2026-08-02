<template>
  <div class="mde" :class="{ 'mde--dragging': dragging }" @dragover.prevent="onDragOver" @dragleave="onDragLeave"
    @drop.prevent="onDrop">
    <div class="mde__bar">
      <div class="mde__tools">
        <v-btn v-for="tool in TOOLS" :key="tool.label" class="mde__tool" variant="text" density="comfortable"
          size="small" :icon="tool.icon" :title="tool.label" :aria-label="tool.label" :disabled="tab === 'preview'"
          @click="apply(tool)"></v-btn>
        <v-btn class="mde__tool" variant="text" density="comfortable" size="small" icon="mdi-image-outline"
          title="Attach an image" aria-label="Attach an image" :disabled="tab === 'preview' || uploading"
          :loading="uploading" @click="pickFile"></v-btn>
      </div>

      <!-- Write and Preview, the two states this thing has. Named rather than an icon toggle
           because "which one am I looking at" should not need a guess. -->
      <div class="mde__tabs">
        <button type="button" class="mde__tab" :class="{ 'mde__tab--on': tab === 'write' }"
          @click="tab = 'write'">Write</button>
        <button type="button" class="mde__tab" :class="{ 'mde__tab--on': tab === 'preview' }"
          @click="tab = 'preview'">Preview</button>
      </div>
    </div>

    <textarea v-show="tab === 'write'" ref="area" class="mde__area" :value="modelValue" :placeholder="placeholder"
      spellcheck="true" @input="onInput" @paste="onPaste" @keydown="onKeydown"></textarea>

    <div v-show="tab === 'preview'" class="mde__preview">
      <MarkdownView v-if="modelValue.trim()" :content="modelValue" />
      <p v-else class="mde__empty">Nothing to preview yet.</p>
    </div>

    <p class="mde__hint">
      Markdown, with tables, <code>```mermaid</code> diagrams and <code>$maths$</code>.
      Drag an image in, paste one from the clipboard, or use the image button. Images up to 5 MB.
    </p>

    <p v-if="uploadError" class="mde__error">{{ uploadError }}</p>

    <input ref="fileInput" type="file" class="mde__file" accept="image/png,image/jpeg,image/gif,application/pdf"
      multiple @change="onFilePicked" />

    <!-- Only shown while a file is over the editor. -->
    <div v-if="dragging" class="mde__drop">Drop to upload</div>
  </div>
</template>

<script lang="ts">
/**
 * Markdown editor for posts.
 *
 * Replaces `vue3-markdown`'s editor, which had no preview of the features this site actually
 * renders (a Mermaid block previewed as a code block) and inlined every dropped image as a base64
 * data URI — a single screenshot could add a megabyte of base64 to the post body, and that body is
 * stored in db.json and sent to every reader.
 *
 * Images now behave the way they do on GitHub: drop, paste or pick a file, an `![Uploading …]()`
 * placeholder appears at the cursor, and it is rewritten to the real `/uploads/...` URL when the
 * upload lands. The preview is the same `MarkdownView` the published page uses, so what is
 * previewed is what gets rendered rather than an approximation of it.
 */
import { defineComponent, ref, nextTick, defineAsyncComponent } from 'vue';
import { apiFetch } from '../../utils/api';

const MarkdownView = defineAsyncComponent(() => import('../MarkdownView.vue'));

type Tool = {
  label: string;
  icon: string;
  /** Text placed before the selection. */
  before: string;
  /** Text placed after it. Empty for line-level tools. */
  after?: string;
  /** What to insert when nothing is selected. */
  sample: string;
  /** Line-level tools apply at the start of the line rather than wrapping a selection. */
  line?: boolean;
};

const TOOLS: Tool[] = [
  { label: 'Bold', icon: 'mdi-format-bold', before: '**', after: '**', sample: 'bold text' },
  { label: 'Italic', icon: 'mdi-format-italic', before: '_', after: '_', sample: 'italic text' },
  { label: 'Heading', icon: 'mdi-format-header-2', before: '## ', sample: 'Heading', line: true },
  { label: 'Link', icon: 'mdi-link-variant', before: '[', after: '](https://)', sample: 'link text' },
  { label: 'Quote', icon: 'mdi-format-quote-close', before: '> ', sample: 'quoted', line: true },
  { label: 'Bulleted list', icon: 'mdi-format-list-bulleted', before: '- ', sample: 'item', line: true },
  { label: 'Inline code', icon: 'mdi-code-tags', before: '`', after: '`', sample: 'code' },
  { label: 'Code block', icon: 'mdi-code-braces', before: '```\n', after: '\n```', sample: 'code' },
  { label: 'Table', icon: 'mdi-table', before: '', sample: '| Column | Column |\n| --- | --- |\n| Cell | Cell |' },
  { label: 'Diagram', icon: 'mdi-graph-outline', before: '', sample: '```mermaid\nflowchart LR\n  A["One"] --> B["Two"]\n```' },
];

const MAX_BYTES = 5 * 1024 * 1024;

export default defineComponent({
  name: 'MarkdownEditor',
  components: { MarkdownView },
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: 'Write your post in markdown…' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const area = ref<HTMLTextAreaElement | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const tab = ref<'write' | 'preview'>('write');
    const dragging = ref(false);
    const uploading = ref(false);
    const uploadError = ref('');
    // Nested dragenter/dragleave events fire as the pointer crosses child elements, so the overlay
    // is driven by a depth count rather than by the last event seen.
    let dragDepth = 0;

    const onInput = (event: Event) => {
      emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
    };

    /** Replace the current selection and put the caret back where the author expects it. */
    const splice = (start: number, end: number, text: string, caret?: number) => {
      const value = props.modelValue;
      const next = value.slice(0, start) + text + value.slice(end);
      emit('update:modelValue', next);
      void nextTick().then(() => {
        const el = area.value;
        if (!el) return;
        const pos = caret ?? start + text.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    };

    const apply = (tool: Tool) => {
      const el = area.value;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = props.modelValue.slice(start, end);

      if (tool.line) {
        // Prefix every selected line, or the current one when nothing is selected.
        const lineStart = props.modelValue.lastIndexOf('\n', start - 1) + 1;
        const body = selected || tool.sample;
        const prefixed = body.split('\n').map((l) => tool.before + l).join('\n');
        splice(lineStart === start ? start : lineStart, end, prefixed);
        return;
      }

      if (!tool.after) {
        // A block sample (table, diagram) is dropped in whole, on its own lines.
        const pad = start > 0 && props.modelValue[start - 1] !== '\n' ? '\n\n' : '';
        splice(start, end, `${pad}${tool.sample}\n`);
        return;
      }

      const body = selected || tool.sample;
      const text = `${tool.before}${body}${tool.after}`;
      // With nothing selected the caret lands on the sample so it can be typed over.
      const caret = selected ? start + text.length : start + tool.before.length;
      splice(start, end, text, selected ? undefined : caret);
      if (!selected) {
        void nextTick().then(() => {
          area.value?.setSelectionRange(caret, caret + body.length);
        });
      }
    };

    /** Tab indents instead of leaving the editor, which is what a code block needs. */
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey) return;
      event.preventDefault();
      const el = area.value;
      if (!el) return;
      splice(el.selectionStart, el.selectionEnd, '  ');
    };

    /**
     * Upload one file and swap its placeholder for the real URL.
     *
     * The placeholder is unique per file so two uploads finishing out of order still each replace
     * their own line, and so the author can keep typing around them while they run.
     */
    const uploadOne = async (file: File, placeholder: string) => {
      const body = new FormData();
      body.append('image', file);
      const res = await apiFetch('/upload', { method: 'POST', body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json.error || `Upload failed for ${file.name}`);

      const isPdf = file.type === 'application/pdf';
      const label = file.name.replace(/\.[^.]+$/, '');
      // A PDF is a link, not an image: an <img> pointing at a PDF renders as a broken icon.
      const markdown = isPdf ? `[${label}](${json.url})` : `![${label}](${json.url})`;
      emit('update:modelValue', props.modelValue.replace(placeholder, markdown));
    };

    const uploadFiles = async (files: File[]) => {
      uploadError.value = '';
      const accepted = files.filter((f) => {
        if (f.size > MAX_BYTES) {
          uploadError.value = `${f.name} is larger than 5 MB.`;
          return false;
        }
        return true;
      });
      if (!accepted.length) return;

      tab.value = 'write';
      uploading.value = true;

      // Every placeholder is inserted first, in one edit, so the caret position used is the one
      // the author was actually at rather than wherever the first upload left it.
      const el = area.value;
      const at = el ? el.selectionEnd : props.modelValue.length;
      const placeholders = accepted.map((f, i) => `![Uploading ${f.name}… ${i}]()`);
      const pad = at > 0 && props.modelValue[at - 1] !== '\n' ? '\n\n' : '';
      splice(at, at, `${pad}${placeholders.join('\n')}\n`);
      await nextTick();

      const results = await Promise.allSettled(
        accepted.map((file, i) => uploadOne(file, placeholders[i]))
      );

      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          uploadError.value = String(result.reason?.message || result.reason);
          // Take the placeholder back out: a line reading "Uploading…" forever is worse than
          // nothing, and the author still has the file.
          emit('update:modelValue', props.modelValue.replace(`${placeholders[i]}\n`, '').replace(placeholders[i], ''));
        }
      });
      uploading.value = false;
    };

    const filesFrom = (list: FileList | null | undefined): File[] =>
      list ? Array.from(list).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf') : [];

    const onPaste = (event: ClipboardEvent) => {
      const files = filesFrom(event.clipboardData?.files);
      if (!files.length) return;
      // Only intercept when the clipboard actually carries a file; a normal text paste is left alone.
      event.preventDefault();
      void uploadFiles(files);
    };

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types?.includes('Files')) return;
      dragDepth = 1;
      dragging.value = true;
    };
    const onDragLeave = () => {
      dragDepth -= 1;
      if (dragDepth <= 0) dragging.value = false;
    };
    const onDrop = (event: DragEvent) => {
      dragDepth = 0;
      dragging.value = false;
      const files = filesFrom(event.dataTransfer?.files);
      if (files.length) void uploadFiles(files);
    };

    const pickFile = () => fileInput.value?.click();
    const onFilePicked = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const files = filesFrom(input.files);
      if (files.length) void uploadFiles(files);
      // Reset so picking the same file twice in a row still fires a change event.
      input.value = '';
    };

    return {
      TOOLS, area, fileInput, tab, dragging, uploading, uploadError,
      onInput, apply, onKeydown, onPaste, onDragOver, onDragLeave, onDrop, pickFile, onFilePicked,
    };
  },
});
</script>

<style scoped>
.mde {
  position: relative;
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 8px;
  background: rgb(var(--v-theme-box-bg-color));
  overflow: hidden;
}

.mde--dragging {
  border-color: rgb(var(--v-theme-link-hover-color));
}

.mde__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px 6px;
  border-bottom: 1px solid rgb(var(--v-theme-border-color));
  background: rgb(var(--v-theme-form));
}

.mde__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  min-width: 0;
}

.mde__tool {
  color: rgb(var(--v-theme-gray-color)) !important;
}

.mde__tool:hover {
  color: rgb(var(--v-theme-text-color)) !important;
}

.mde__tabs {
  display: flex;
  gap: 4px;
  flex: 0 0 auto;
}

.mde__tab {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 6px;
  color: rgb(var(--v-theme-gray-color));
  /* 40px of touch target on a phone without making the desktop chrome look chunky. */
  min-height: 32px;
}

.mde__tab--on {
  color: rgb(var(--v-theme-text-color));
  background: rgb(var(--v-theme-background));
}

.mde__area {
  display: block;
  width: 100%;
  min-height: 340px;
  resize: vertical;
  padding: 1rem;
  border: 0;
  outline: none;
  background: transparent;
  color: rgb(var(--v-theme-text-color));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9rem;
  line-height: 1.7;
  /* The source is monospaced text; long lines wrap rather than scroll sideways. */
  white-space: pre-wrap;
  tab-size: 2;
}

.mde__preview {
  min-height: 340px;
  padding: 1rem;
  overflow-y: auto;
}

.mde__empty {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
}

.mde__hint {
  margin: 0 !important;
  padding: 0.5rem 1rem;
  border-top: 1px solid rgb(var(--v-theme-border-color));
  background: rgb(var(--v-theme-form));
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.78rem;
  line-height: 1.6;
}

.mde__hint code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.95em;
}

.mde__error {
  margin: 0 !important;
  padding: 0.5rem 1rem;
  color: rgb(var(--v-theme-text-color));
  background: rgba(var(--v-theme-error), 0.14);
  font-size: 0.82rem;
}

.mde__file {
  display: none;
}

/* Covers the editor while a file is over it, so the drop target is unmistakable. */
.mde__drop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-background), 0.88);
  border: 2px dashed rgb(var(--v-theme-link-hover-color));
  border-radius: 8px;
  color: rgb(var(--v-theme-text-color));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.9rem;
  pointer-events: none;
}

@media (max-width: 600px) {
  .mde__area,
  .mde__preview {
    min-height: 260px;
  }
}
</style>
