<template>
  <div class="page-body">
    <!-- Header Section -->
    <div class="section header-section">
      <h1 class="mb-4 text-h4 font-weight-bold">Guestbook</h1>
      <div class="e-content text-body-1">
        <p class="mt-4 mb-4">
          <v-img class="left pixelated guestbook-img" src="/src/assets/images/guestbook.gif" alt="Guestbook animation"
            width="96" height="96" />
          Hi there! Back in the 90s and early 2000s, guestbooks were a staple of personal websites—a charming way for
          visitors to leave their mark. I love this tradition, so please feel free to share a few words or just say
          hello. Thanks for exploring my little corner of the web!
        </p>
      </div>
      <div class="text-center mb-6 mt-6">
        <v-btn @click="scrollToGuestbook" color="info" size="large" class="text-capitalize" elevation="2">
          Sign Guestbook
        </v-btn>
      </div>
    </div>

    <!-- Messages Intro -->
    <div class="section">
      <v-alert class="mb-6 intro-alert" type="info" variant="tonal" density="comfortable">
        <p class="text-body-1">
          Below are heartfelt notes from amazing visitors. Each message brings a smile to my face and truly makes my day
          brighter. Add your voice—your words mean more than you know!
        </p>
      </v-alert>
    </div>

    <!-- Guestbook Messages -->
    <div class="section messages-section scrollable-div mb-6"
      :style="{ height: guestbooks.length < 3 ? 'auto' : '550px' }">
      <LoadingComponent v-if="apiLoadingStore.isLoading()" type="card" :content-length="4"
        :content-name="'Guestbooks'" />
      <v-row v-else class="ma-0 pa-0" dense>
        <v-col v-for="guestbook in guestbooks" :key="guestbook.name" cols="12" xl="6" md="6" sm="6" class="pa-2">
          <v-card class="guestbook-card" variant="tonal"
            :style="{ background: `${themeMode.current.value.dark ? 'transparent' : randomCardColor()} !important` }"
            elevation="4">
            <div class="card-header">
              <p class="d-flex align-center mb-0">
                <a v-if="guestbook.website" :href="normalizeUrl(guestbook.website)"
                  :title="`Visit ${guestbook.website}`" target="_blank"
                  class="guestbook-link text-subtitle-1 font-weight-medium">
                  {{ guestbook.name }}
                </a>
                <span v-else class="guestbook-normal-text text-subtitle-1 font-weight-medium">
                  {{ guestbook.name }}
                </span>
              </p>
              <small :class="`${themeMode.current.value.dark ? '' : 'date-style'} text-caption`">
                {{ formatData(guestbook.createdAt || '') }}
              </small>
            </div>
            <p class="guestbook-message text-body-2">
              {{ guestbook.message.length > 120 ? guestbook.message.slice(0, 120) + '...' : guestbook.message }}
            </p>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Guestbook Form -->
    <div class="section form-section" id="guestbookForm">
      <v-card class="form-card pa-5" elevation="3" :style="{ background: 'transparent !important' }">
        <v-form v-model="validForm" @submit.prevent="writeGuestbook(newGuestbook)">
          <v-text-field v-model="newGuestbook.name" :counter="25" prepend-inner-icon="mdi-account" :rules="newGuestbook.name && newGuestbook.name.length > 0 ? nameRules({
            fieldName: 'Your Name',
            maxLength: 25,``
            minLength: 5
          }) : []" label="Your Name" hint="Your name, handle, or full name. Leave blank for 'Anonymous'."
            persistent-hint variant="outlined" class="mb-4" />
          <v-text-field v-model="newGuestbook.website" :counter="100" prepend-inner-icon="mdi-web"
            :rules="newGuestbook.website?.length ? websiteRules() : []" label="Your Website/Github (Optional)"
            hint="If provided, we'll validate and link it." persistent-hint variant="outlined" class="mb-4" />
          <v-textarea v-model="newGuestbook.message" :counter="500" prepend-inner-icon="mdi-message" :rules="longTextRules({
            fieldName: 'Your Message',
            maxLength: 500,
            minLength: 30
          })" label="Your Message*" variant="outlined" rows="4" class="mb-4" />
          <v-alert class="mb-4" type="warning" variant="tonal" density="compact">
            <p class="text-subtitle-2 mb-1">Anti-bot Check 🙃</p>
            <small class="text-caption">
              To keep spam at bay, please enter my most common @handle or @fullname (hint: it's in this site's domain).
            </small>
          </v-alert>
          <v-text-field prepend-inner-icon="mdi-lock" :rules="antiBotRules()" label="Verification*" variant="outlined"
            class="mb-6" />
          <div class="d-flex justify-end">
            <v-btn color="info" :disabled="!validForm" type="submit" size="large" class="text-capitalize" elevation="2">
              Sign Guestbook
            </v-btn>
          </div>
        </v-form>
      </v-card>
    </div>
  </div>
</template>

<script lang="ts">
import { onMounted, ref } from 'vue';
import { nameRules, antiBotRules, websiteRules, longTextRules } from '../utils';
import { type GuestBookType } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import { useAPILoading } from '../store';
import { formatData } from '../utils';
import { useTheme } from 'vuetify';

export default {
  name: 'Guestbook',
  components: { LoadingComponent },
  setup() {
    const validForm = ref(false);
    const newGuestbook = ref<GuestBookType>({ name: '', website: '', message: '' });
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    const guestbooks = ref<GuestBookType[]>([]);
    const apiLoadingStore = useAPILoading();
    const themeMode = useTheme();

    const cardColors = [
      '#ffffba', '#bae1ff', '#baffc9',
      '#ffdfba', '#ffb3ba'
    ];

    const randomCardColor = () => {
      return cardColors[Math.floor(Math.random() * cardColors.length)];
    };

    const loadGuestbooks = async () => {
      try {
        apiLoadingStore.setLoading(true);
        const res = await fetch(`${serverUrl}/guestbooks`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('Network response was not ok');
        const result = await res.json();
        guestbooks.value = result.data.sort((a: GuestBookType, b: GuestBookType) =>
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
      } catch (error) {
        console.error('Failed to load guestbooks:', error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const writeGuestbook = async (guestbook: GuestBookType) => {
      try {
        apiLoadingStore.setLoading(true);
        const submission = { ...guestbook, name: guestbook.name || 'Anonymous' };
        const res = await fetch(`${serverUrl}/guestbooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        });
        if (!res.ok) throw new Error('Failed to submit');
        const result = await res.json();
        guestbooks.value.unshift({ ...result.data, createdAt: new Date().toISOString() });
        newGuestbook.value = { name: '', website: '', message: '' };
      } catch (error) {
        console.error('Failed to write guestbook:', error);
      } finally {
        apiLoadingStore.setLoading(false);
      }
    };

    const scrollToGuestbook = () => {
      document.getElementById('guestbookForm')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    };

    const normalizeUrl = (url: string) => {
      return url.match(/^https?:\/\//) ? url : `https://${url}`;
    };

    onMounted(loadGuestbooks);

    return {
      guestbooks,
      validForm,
      newGuestbook,
      apiLoadingStore,
      themeMode,
      randomCardColor,
      formatData,
      normalizeUrl,
      longTextRules,
      websiteRules,
      antiBotRules,
      scrollToGuestbook,
      nameRules,
      writeGuestbook,
    };
  }
};
</script>

<style scoped>
.page-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header-section {
  padding: 2rem 0;
}

.messages-section {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}

.messages-section::-webkit-scrollbar {
  width: 8px;
}

.messages-section::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.messages-section::-webkit-scrollbar-track {
  background: transparent;
}

.guestbook-card {
  padding: 16px;
  border-radius: 8px !important;
  border: 1px solid rgb(var(--v-theme-border-color)) !important;
  height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease;
}

.guestbook-card:hover {
  transform: translateY(-4px);
}

.card-header {
  margin-bottom: 8px;
}

.guestbook-link {
  text-decoration: underline;
  transition: color 0.2s ease;
}

.guestbook-normal-text {
  transition: color 0.2s ease;
}

.guestbook-link:hover {
  color: #1557b0 !important;
  text-decoration: underline;
}

.guestbook-message {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  flex-grow: 1;
}

.date-style {
  color: rgba(0, 0, 0, 0.6);
}

.form-card {
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.95) !important;
}

.guestbook-img {
  float: left;
  margin-right: 1.5rem;
  margin-bottom: 1rem;
}

.pixelated {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

@media (max-width: 600px) {
  .guestbook-card {
    height: auto;
    min-height: 140px;
  }

  .page-body {
    padding: 10px;
  }
}
</style>