declare module 'vue3-markdown' {
    import { Component } from 'vue';

    export interface VMarkdownEditorProps {
        modelValue?: string;
        locale?: string;
        uploadAction?: (_file: File) => Promise<string>;
    }

    export const VMarkdownEditor: Component<VMarkdownEditorProps>;

    export interface VMarkdownViewProps {
        mode?: string;
        content?: string;
    }

    export const VMarkdownView: Component<VMarkdownViewProps>;
}
