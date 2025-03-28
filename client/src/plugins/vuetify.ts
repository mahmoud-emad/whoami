import "vuetify/styles";
import { createVuetify } from "vuetify";
import { useDark } from '@vueuse/core';
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// Get the dark mode state from useDark hook
const isDark = useDark();

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: isDark.value ? 'dark' : 'light',
        themes: {
            dark: {
                dark: true,
                colors: {
                    background: "#01061F",
                    "text-color": "#ffffff",
                    "border-color": "#123869",
                    "gray-color": "#cdd4df",
                    "link-color": "#cdd4df",
                    "box-bg-color": "#120131bb",
                    "link-hover-color": "#82adf3",
                    "front-end-bg-color": "#05143dbb",
                    "back-end-bg-color": "#05283dbb",
                    "form": "#091C21FF"
                },
            },
            light: {
                dark: false,
                colors: {
                    background: "#fff",
                    "text-color": "#000",
                    "border-color": "#dddddd",
                    "gray-color": "#9e9e9e",
                    "link-color": "#6200ee",
                    "box-bg-color": "#ffffff",
                    "link-hover-color": "#82adf3",
                    "front-end-bg-color": "#cedeff",
                    "back-end-bg-color": "#c4e1ff",
                    "form": "red",
                },
            },
        },
    },
});

export default vuetify;
