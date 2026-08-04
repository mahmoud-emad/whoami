<template>
  <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />

  <v-alert v-if="!apiLoadingStore.isLoading() && files.length === 0" type="info" variant="tonal" class="mb-4">
    No uploaded files yet. Anything you upload while editing a post, your profile or your branding shows up here.
  </v-alert>

  <!-- The table has more columns than a phone can fit, so it scrolls inside its own container
       rather than widening the page. -->
  <div v-if="files.length > 0" class="table-scroll mb-4">
    <v-data-table :headers="headers" :items="files" :loading="apiLoadingStore.isLoading()" items-per-page="10"
      density="comfortable">

    <template #item.preview="{ item }">
      <a :href="item.url" target="_blank" :title="`Open ${item.name}`">
        <v-img v-if="item.isImage" :src="item.url" :alt="item.name" width="56" height="56" cover
          class="rounded"></v-img>
        <v-icon v-else-if="item.isPdf" size="40" color="error">mdi-file-pdf-box</v-icon>
        <v-icon v-else size="40">mdi-file-outline</v-icon>
      </a>
    </template>

    <template #item.size="{ item }">{{ formatSize(item.size) }}</template>

    <template #item.modifiedAt="{ item }">{{ formatData(item.modifiedAt) }}</template>

    <template #item.actions="{ item }">
      <v-btn :title="`Copy URL for ${item.name}`" icon="mdi-content-copy" size="small" variant="text"
        @click="copyUrl(item.url)"></v-btn>
      <v-btn :title="`Delete ${item.name}`" icon="mdi-delete" color="error" size="small" variant="text"
        :disabled="apiLoadingStore.isLoading()" @click="deleteFile(item.name)"></v-btn>
    </template>

    </v-data-table>
  </div>

  <div class="form-actions">
    <v-btn :loading="apiLoadingStore.isLoading()" :disabled="apiLoadingStore.isLoading()" @click="loadFiles"
      title="Refresh uploads" color="primary" variant="tonal" prepend-icon="mdi-refresh">Refresh</v-btn>
  </div>
</template>

<style scoped>
/* min-width:0 matters as much as the overflow rule: without it a flex parent lets this box keep
   its full content width and the page scrolls sideways instead of the table. */
.table-scroll {
  overflow-x: auto;
  max-width: 100%;
  min-width: 0;
  -webkit-overflow-scrolling: touch;
}

/* Vuetify's small icon buttons are 28px square, well under a comfortable thumb target. The row
   height is driven by the 56px preview thumbnail, so widening these costs nothing. */
.table-scroll :deep(.v-btn--icon.v-btn--size-small) {
  width: 40px;
  height: 40px;
}

/* Keep cells on one line so the horizontal scroll does the work instead of the text wrapping
   into an unreadable column. */
.table-scroll :deep(td),
.table-scroll :deep(th) {
  white-space: nowrap;
}
</style>

<script lang="ts">
import { ref, onMounted } from 'vue';
import FeedbackNote from '../../components/admin/FeedbackNote.vue';
import { apiFetch } from '../../utils/api';
import { useAPILoading } from '../../store';
import { formatData } from '../../utils';
import { useFormFeedback } from '../../composables/useFormFeedback';

interface UploadFile {
  name: string;
  size: number;
  modifiedAt: string;
  url: string;
  isPdf: boolean;
  isImage: boolean;
}

const TABLE_HEADERS = [
  { title: '', key: 'preview', sortable: false, width: 80 },
  { title: 'Name', key: 'name' },
  { title: 'Size', key: 'size' },
  { title: 'Modified', key: 'modifiedAt' },
  { title: 'Actions', key: 'actions', sortable: false, width: 120 },
];

const KB = 1024;
const MB = KB * 1024;

const formatSize = (bytes: number): string => {
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
};

export default {
  name: 'UploadsManager',
  components: { FeedbackNote },
  setup() {
    const apiLoadingStore = useAPILoading();
    const { responseType, responseMessage, success, error } = useFormFeedback();
    const files = ref<UploadFile[]>([]);

    const loadFiles = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/uploads`);
        const result = await res.json();
        if (res.ok) {
          files.value = result.data || [];
        } else {
          error(result.error || 'Failed to load uploads.');
        }
      } catch (e: any) {
        error('Failed to load uploads: ' + (e?.message || ''));
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const deleteFile = async (name: string) => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await apiFetch(`/uploads/${encodeURIComponent(name)}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
          files.value = files.value.filter((f) => f.name !== name);
          success(`Deleted ${name}`);
        } else {
          error(result.error || result.message || 'Delete failed.');
        }
      } catch (e: any) {
        error('Delete failed: ' + (e?.message || ''));
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const copyUrl = async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        success('URL copied to clipboard');
      } catch {
        error('Failed to copy URL.');
      }
    };

    onMounted(loadFiles);

    return {
      apiLoadingStore,
      files,
      headers: TABLE_HEADERS,
      responseType,
      responseMessage,
      formatSize,
      formatData,
      loadFiles,
      deleteFile,
      copyUrl,
    };
  },
};
</script>
