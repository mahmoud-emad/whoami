<template>
    <v-alert v-if="hintMessage" :type="hintType" variant="tonal" class="mb-4">
        {{ hintMessage }}
    </v-alert>
    <!-- Deleting is irreversible, so the option has to stay legible on a phone: select-menu-wrap
         lets long signer names wrap rather than be clipped to an ellipsis. -->
    <v-select :loading="apiLoadingStore.isLoading()" :disabled="guestbooks.length === 0" item-title="name"
        item-value="id" class="mb-4" label="Select guestbook" variant="outlined" hide-details="auto" :items="guestbooks"
        :menu-props="{ contentClass: 'select-menu-wrap' }" v-model="selectedGuestbookID">
    </v-select>
    <div class="form-actions mb-4">
        <v-btn @click="deleteSelectedGuestbook" :disabled="guestbooks.length === 0 || selectedGuestbookID === null"
            title="When you press, the guestbook will be deleted" color="error" variant="tonal">Delete</v-btn>
    </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading } from '../../store';
import { type GuestBookType } from '../../types';

export default {
    setup() {
        const guestbooks = ref([]);
        const selectedGuestbookID = ref(null);
        const apiLoadingStore = useAPILoading()
        const hintMessage = ref('');
        const hintType = ref<'error' | 'info' | 'success' | 'warning'>('info');

        onMounted(async () => {
            try {
                apiLoadingStore.setLoading(true)
                const res = await apiFetch(`/guestbooks`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                const result = await res.json();
                guestbooks.value = result.data;
                if (guestbooks.value.length === 0) {
                    hintMessage.value = 'No guestbooks found';
                    hintType.value = 'error';
                }
            } catch (error) {
                console.error("Failed to load guestbooks:", error);
            } finally {
                apiLoadingStore.setLoading(false)
            }
        })

        const deleteSelectedGuestbook = async () => {
            try {
                apiLoadingStore.setLoading(true)
                await apiFetch(`/guestbooks/${selectedGuestbookID.value}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                });
                guestbooks.value = guestbooks.value.filter((guestbook: GuestBookType) => guestbook.id !== selectedGuestbookID.value);
                selectedGuestbookID.value = null;
                hintMessage.value = 'Guestbook deleted successfully';
                hintType.value = 'success';
            } catch (error) {
                console.error("Failed to delete guestbook:", error);
            } finally {
                apiLoadingStore.setLoading(false)
                setTimeout(() => {
                    hintMessage.value = '';
                    hintType.value = 'info';
                }, 3000);
            }
        }

        return {
            deleteSelectedGuestbook,
            apiLoadingStore,
            selectedGuestbookID,
            guestbooks,
            hintMessage,
            hintType
        };
    }
};
</script>