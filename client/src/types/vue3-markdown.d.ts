declare module 'vue3-markdown' {
    import { Component } from 'vue';

    export interface VMarkdownEditorProps {
        modelValue?: string;
        locale?: string;
        uploadAction?: (file: File) => Promise<string>;
    }

    export const VMarkdownEditor: Component<VMarkdownEditorProps>;
}
