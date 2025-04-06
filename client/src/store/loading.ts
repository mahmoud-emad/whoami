import { defineStore } from "pinia";
import { type Ref, ref } from "vue";

const useAPILoading = defineStore("apiLoading", {
    state: (): { loading: Ref<boolean> } => {
        return { loading: ref(false) }
    },

    actions: {
        setLoading(value: boolean) {
            this.loading = value
        },

        isLoading(): boolean {
            return this.loading === true

        },

        getLoading(): boolean {
            return this.loading
        }
    }
})

export default useAPILoading