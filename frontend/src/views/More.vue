<template>
  <div class="page-body">
    <!--
      Every card and link on this page comes from admin settings. Nothing is hardcoded any more:
      the page used to advertise pages like /uses and /impossible-list that were never built, so
      visitors landed on blank screens. Empty lists simply render nothing.
      The owner is the exception — with nothing configured yet there would be nowhere to put the
      Add buttons, so for them the sections stay on screen.
    -->
    <section class="section">
      <h1>{{ pageTitle }}</h1>
      <p v-if="intro">{{ intro }}</p>

      <!-- Owner-only strip, below the intro, so a signed-out page emits exactly the markup it did
           before in-place editing existed. -->
      <div v-if="isAdmin" class="owner-bar">
        <InlineActions label="page copy" :remove="false" @edit="openPageCopy" />
        <FeedbackNote v-if="!anyEditorOpen && responseMessage" :message="responseMessage" :type="responseType" class="owner-bar__alert" />
      </div>
    </section>

    <template v-if="cards.length || isAdmin">
      <div class="long-line opacity-80 mt-2 mb-2"></div>
      <section class="section hidden-pages">
        <div v-if="isAdmin" class="owner-bar">
          <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a card"
            class="text-capitalize" :disabled="busy" @click="openCardCreate">Add card</v-btn>
        </div>
        <p v-if="isAdmin && !cards.length" class="owner-hint">No cards yet — add the first one above.</p>

        <v-row>
          <v-col v-for="card in cards" :key="`card-${card.index}`" cols="12" md="6">
            <div v-if="isAdmin" class="entry-tools">
              <!-- The owner is looking at an entry nobody else can see; say so rather than let it
                   read as a rendering bug. -->
              <span v-if="card.show === false" class="entry-tools__flag">HIDDEN</span>
              <InlineActions label="card" @edit="openCardEdit(card)" @remove="removeCard(card)" />
            </div>
            <ContactInfo :class="{ 'entry--parked': isAdmin && card.show === false }" :title="card.title"
              :description="card.description" :link="card.link" :linkText="card.linkText"
              :cols="display.mdAndUp.value" />
          </v-col>
        </v-row>
      </section>
    </template>

    <template v-if="shoebox.length || isAdmin">
      <div class="long-line opacity-80"></div>
      <section class="section">
        <h1>📦 Shoebox</h1>
        <p v-if="shoeboxIntro" class="mb-3">{{ shoeboxIntro }}</p>

        <div v-if="isAdmin" class="owner-bar">
          <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a shoebox link"
            class="text-capitalize" :disabled="busy" @click="openItemCreate">Add shoebox link</v-btn>
          <InlineActions label="shoebox intro" :remove="false" @edit="openShoeboxCopy" />
        </div>
        <p v-if="isAdmin && !shoebox.length" class="owner-hint">No links yet — add the first one above.</p>

        <v-row>
          <v-col class="pt-0 pb-0" v-for="item in shoebox" :key="`shoe-${item.index}`" cols="12" md="4" sm="12"
            xl="4">
            <div v-if="isAdmin" class="entry-tools">
              <span v-if="item.show === false" class="entry-tools__flag">HIDDEN</span>
              <InlineActions label="link" @edit="openItemEdit(item)" @remove="removeItem(item)" />
            </div>
            <ContactInfo :class="{ 'entry--parked': isAdmin && item.show === false }" :link="item.link"
              :linkText="item.name" :cols="display.mdAndUp.value" />
          </v-col>
        </v-row>
      </section>
    </template>

    <!-- Every dialog is mounted only for the owner, so a visitor never loads a form at all. -->
    <EditorDialog v-if="isAdmin" v-model="cardEditorOpen" :title="cardEditorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="cardValid" :disabled="saving">
        <v-text-field v-model="cardDraft.title" :rules="requiredRules('Title')" title="Card Title" label="Title"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-textarea v-model="cardDraft.description" :rules="longTextRules({ fieldName: 'Description', maxLength: 400 })"
          title="Card Description" label="Description" variant="outlined"
          hide-details="auto" rows="2" auto-grow class="mb-4"></v-textarea>
        <v-text-field v-model="cardDraft.linkText" :rules="nameRules({ fieldName: 'Link text', maxLength: 60 })"
          title="Card Link Text" label="Link text" variant="outlined"
          hide-details="auto" hint="What the link itself says. Empty shows nothing to click."
          persistent-hint class="mb-4"></v-text-field>
        <!-- allowRelative: an internal route like /uses is as valid here as an external URL. -->
        <v-text-field v-model="cardDraft.link" :rules="linkRules({ fieldName: 'Link', required: true })" title="Card Link"
          label="Link (URL or /path)" placeholder="https://…" variant="outlined" hide-details="auto"
          class="mb-4"></v-text-field>
        <!-- `show` parks a card without deleting it, which is how the rest of the config models
             optional entries. -->
        <v-switch v-model="cardDraft.show" color="primary" inset hide-details density="compact"
          :label="cardDraft.show ? 'Visible' : 'Hidden'"></v-switch>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="cardEditorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!cardValid || saving"
          class="text-capitalize" @click="saveCard">{{ cardIndex === null ? 'Add card' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>

    <EditorDialog v-if="isAdmin" v-model="itemEditorOpen" :title="itemEditorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form v-model="itemValid" :disabled="saving">
        <v-text-field v-model="itemDraft.name" :rules="requiredRules('Name')" title="Link Name" label="Name"
          variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-text-field v-model="itemDraft.link" :rules="linkRules({ fieldName: 'Link', required: true })"
          title="Link" label="Link (URL or /path)"
          placeholder="https://…" variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
        <v-switch v-model="itemDraft.show" color="primary" inset hide-details density="compact"
          :label="itemDraft.show ? 'Visible' : 'Hidden'"></v-switch>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="itemEditorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!itemValid || saving"
          class="text-capitalize" @click="saveItem">{{ itemIndex === null ? 'Add link' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>

    <!-- One dialog for both bits of copy, in the mode the control that opened it asked for: the
         shoebox pencil should not present the page heading, and vice versa. -->
    <EditorDialog v-if="isAdmin" v-model="copyEditorOpen" :title="copyEditorTitle">
      <FeedbackNote v-if="responseMessage" :message="responseMessage" :type="responseType" class="mb-4" />
      <v-form :disabled="saving">
        <template v-if="copyTarget === 'page'">
          <v-text-field v-model="copyDraft.title" :rules="nameRules({ fieldName: 'Heading', maxLength: 80 })"
            title="Page Heading" label="Heading" variant="outlined"
            hide-details="auto" :hint="`Leave empty to fall back to “${defaultPageTitle}”.`" persistent-hint
            class="mb-4"></v-text-field>
          <v-textarea v-model="copyDraft.intro" :rules="longTextRules({ fieldName: 'Intro paragraph', maxLength: 600 })"
            title="Page Intro" label="Intro paragraph" variant="outlined"
            hide-details="auto" rows="2" auto-grow class="mb-4"></v-textarea>
        </template>
        <v-textarea v-else v-model="copyDraft.shoeboxIntro" :rules="longTextRules({ fieldName: 'Shoebox intro', maxLength: 600 })"
          title="Shoebox Intro" label="Shoebox intro"
          variant="outlined" hide-details="auto" rows="2" auto-grow
          hint="Sits under the Shoebox heading. Empty drops it." persistent-hint class="mb-4"></v-textarea>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="copyEditorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="saving" class="text-capitalize"
          @click="saveCopy">Save changes</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import FeedbackNote from '../components/admin/FeedbackNote.vue';
import { useDisplay } from "vuetify";
import ContactInfo from "../components/ContactInfo.vue";
import EditorDialog from "../components/admin/EditorDialog.vue";
import InlineActions from "../components/admin/InlineActions.vue";
import { useSettingsStore } from "../store";
import { useAdmin } from "../composables/useAdmin";
import { useFormFeedback } from "../composables/useFormFeedback";
import { deepClone } from "../utils";
import type { MoreCard, MoreShoeboxItem, MoreType, PageCopy, PagesConfig } from "../types";
import { linkRules, longTextRules, nameRules } from '../utils';

/** An entry plus its position in the stored array — what the editing controls address. */
type RenderCard = MoreCard & { index: number };
type RenderItem = MoreShoeboxItem & { index: number };

/** Heading when the owner has not set one. Page chrome, so a built-in default is fine. */
const DEFAULT_PAGE_TITLE = 'What else can I find?';

const emptyMore = (): MoreType => ({ intro: '', cards: [], shoeboxIntro: '', shoebox: [] });
const emptyCard = (): MoreCard => ({ title: '', description: '', linkText: '', link: '', show: true });
const emptyItem = (): MoreShoeboxItem => ({ name: '', link: '', show: true });

/** Merge a stored entry over an empty one, so config written before a field existed still edits. */
const normaliseCard = (card?: Partial<MoreCard> | null): MoreCard => ({ ...emptyCard(), ...(card || {}) });
const normaliseItem = (item?: Partial<MoreShoeboxItem> | null): MoreShoeboxItem =>
  ({ ...emptyItem(), ...(item || {}) });

export default defineComponent({
  name: "MoreView",
  components: { FeedbackNote,
    ContactInfo,
    EditorDialog,
    InlineActions,
  },
  setup() {
    const display = useDisplay();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    // In-place editing state. A null index means the dialog is adding rather than editing.
    const cardEditorOpen = ref(false);
    const itemEditorOpen = ref(false);
    const copyEditorOpen = ref(false);
    const cardIndex = ref<number | null>(null);
    const itemIndex = ref<number | null>(null);
    const cardDraft = ref<MoreCard>(emptyCard());
    const itemDraft = ref<MoreShoeboxItem>(emptyItem());
    const copyTarget = ref<'page' | 'shoebox'>('page');
    const copyDraft = ref({ title: '', intro: '', shoeboxIntro: '' });
    const cardValid = ref(false);
    const itemValid = ref(false);
    const saving = ref(false);
    // Set while any write is in flight. Delete has no dialog of its own, so this is what stops a
    // second click landing before the first round trip has come back.
    const busy = ref(false);

    const more = computed(() => settingsStore.profile?.more);

    /**
     * `pages` has no `more` entry in the shared PagesConfig type, so this page's copy is read and
     * written through a loose view of that map rather than widening a shared type from one view.
     */
    const pageMap = (): Record<string, PageCopy> =>
      (settingsStore.profile?.pages || {}) as unknown as Record<string, PageCopy>;

    const pageCopy = computed<Partial<PageCopy>>(() => pageMap().more || {});

    const pageTitle = computed(() => pageCopy.value.title?.trim() || DEFAULT_PAGE_TITLE);
    // The intro used to live only at profile.more.intro, which is still read as a fallback so an
    // install configured before pages.more existed keeps its paragraph.
    const intro = computed(() => pageCopy.value.intro?.trim() || more.value?.intro?.trim() || '');
    const shoeboxIntro = computed(() => more.value?.shoeboxIntro?.trim() || '');

    const anyEditorOpen = computed(
      () => cardEditorOpen.value || itemEditorOpen.value || copyEditorOpen.value,
    );

    const cardEditorTitle = computed(() => (cardIndex.value === null ? 'Add card' : 'Edit card'));
    const itemEditorTitle = computed(() => (itemIndex.value === null ? 'Add shoebox link' : 'Edit shoebox link'));
    const copyEditorTitle = computed(() =>
      copyTarget.value === 'page' ? 'Edit page copy' : 'Edit shoebox intro',
    );

    /**
     * A card needs somewhere real to point, so entries without a link are dropped rather than
     * rendered as dead text. `show` lets an entry be parked without deleting it.
     *
     * The owner sees every entry, parked or half-written — otherwise a hidden card could never be
     * brought back, and a card missing its link could never be repaired from the page itself.
     * `index` is the position in settings, which is what edit and delete address.
     */
    const cards = computed<RenderCard[]>(() =>
      (more.value?.cards || [])
        .map((c, index) => ({ ...normaliseCard(c), index }))
        .filter((c) => isAdmin.value || (c.show !== false && c.link.trim() && c.title.trim()))
    );

    const shoebox = computed<RenderItem[]>(() =>
      (more.value?.shoebox || [])
        .map((i, index) => ({ ...normaliseItem(i), index }))
        .filter((i) => isAdmin.value || (i.show !== false && i.link.trim() && i.name.trim()))
    );

    /** Editable copy of what settings holds right now, so nothing mutates the store in place. */
    const moreSource = (): MoreType => {
      const current = deepClone(more.value || {}) as Partial<MoreType>;
      return {
        ...emptyMore(),
        ...current,
        // Hand-written config can leave either list off entirely, or as something that is not a list.
        cards: Array.isArray(current.cards) ? current.cards.map(normaliseCard) : [],
        shoebox: Array.isArray(current.shoebox) ? current.shoebox.map(normaliseItem) : [],
      };
    };

    /**
     * The More page is not a collection of its own — it is one object inside site settings, so
     * there is no `/more` endpoint to POST to. Only the `profile.more` slice is written back, which
     * is what stops this from clobbering whatever another form last saved.
     */
    const commit = async (next: MoreType, okMessage: string, failMessage: string) => {
      try {
        busy.value = true;
        const full = settingsStore.getSettings();
        full.profile = { ...full.profile, more: next };
        await settingsStore.saveSettings(full);
        // No local mirror to reconcile: saveSettings pushes the saved document back into the store
        // and this page renders straight off it.
        success(okMessage);
        return true;
      } catch (e: any) {
        error(e?.message || failMessage);
        return false;
      } finally {
        busy.value = false;
      }
    };

    const openCardCreate = () => {
      clear();
      cardIndex.value = null;
      cardDraft.value = emptyCard();
      cardEditorOpen.value = true;
    };

    const openCardEdit = (card: RenderCard) => {
      clear();
      const source = moreSource().cards[card.index];
      if (!source) return;
      cardIndex.value = card.index;
      // Clone so typing in the dialog does not rewrite the card behind it before anything is saved.
      cardDraft.value = normaliseCard(deepClone(source));
      cardEditorOpen.value = true;
    };

    const saveCard = async () => {
      const next = moreSource();
      const isNew = cardIndex.value === null;
      const card = normaliseCard(deepClone(cardDraft.value));
      card.title = card.title.trim();
      card.link = card.link.trim();

      // Appending when the index no longer exists: the settings document could have been rewritten
      // elsewhere while the dialog was open, and writing past the end would leave a hole.
      if (isNew || cardIndex.value! >= next.cards.length) next.cards.push(card);
      else next.cards[cardIndex.value!] = card;

      saving.value = true;
      const ok = await commit(next, isNew ? 'Card added.' : 'Card updated.', 'Failed to save the card.');
      saving.value = false;
      if (ok) cardEditorOpen.value = false;
    };

    const removeCard = async (card: RenderCard) => {
      const next = moreSource();
      if (card.index < 0 || card.index >= next.cards.length) return;
      next.cards.splice(card.index, 1);
      await commit(next, 'Card deleted.', 'Failed to delete the card.');
    };

    const openItemCreate = () => {
      clear();
      itemIndex.value = null;
      itemDraft.value = emptyItem();
      itemEditorOpen.value = true;
    };

    const openItemEdit = (item: RenderItem) => {
      clear();
      const source = moreSource().shoebox[item.index];
      if (!source) return;
      itemIndex.value = item.index;
      itemDraft.value = normaliseItem(deepClone(source));
      itemEditorOpen.value = true;
    };

    const saveItem = async () => {
      const next = moreSource();
      const isNew = itemIndex.value === null;
      const item = normaliseItem(deepClone(itemDraft.value));
      item.name = item.name.trim();
      item.link = item.link.trim();

      if (isNew || itemIndex.value! >= next.shoebox.length) next.shoebox.push(item);
      else next.shoebox[itemIndex.value!] = item;

      saving.value = true;
      const ok = await commit(next, isNew ? 'Link added.' : 'Link updated.', 'Failed to save the link.');
      saving.value = false;
      if (ok) itemEditorOpen.value = false;
    };

    const removeItem = async (item: RenderItem) => {
      const next = moreSource();
      if (item.index < 0 || item.index >= next.shoebox.length) return;
      next.shoebox.splice(item.index, 1);
      await commit(next, 'Link deleted.', 'Failed to delete the link.');
    };

    const openCopyEditor = (target: 'page' | 'shoebox') => {
      clear();
      copyTarget.value = target;
      // Seeded from what the page is actually showing, so an intro still living in the legacy
      // profile.more.intro field is carried over rather than silently replaced by an empty box.
      copyDraft.value = {
        title: pageCopy.value.title || '',
        intro: intro.value,
        shoeboxIntro: more.value?.shoeboxIntro || '',
      };
      copyEditorOpen.value = true;
    };

    const openPageCopy = () => openCopyEditor('page');
    const openShoeboxCopy = () => openCopyEditor('shoebox');

    const saveCopy = async () => {
      try {
        saving.value = true;
        const full = settingsStore.getSettings();
        const next = moreSource();

        if (copyTarget.value === 'page') {
          // The heading and intro move into pages.more, next to every other page's copy. The legacy
          // profile.more.intro is cleared at the same time because it is still read as a fallback —
          // left behind, clearing the intro here would make the old paragraph reappear.
          next.intro = '';
          const pages = {
            ...deepClone(pageMap()),
            more: { title: copyDraft.value.title.trim(), intro: copyDraft.value.intro.trim() },
          };
          // Only this page's entry is added, so the copy of every other page is left alone.
          full.profile = { ...full.profile, more: next, pages: pages as unknown as PagesConfig };
        } else {
          next.shoeboxIntro = copyDraft.value.shoeboxIntro.trim();
          full.profile = { ...full.profile, more: next };
        }

        await settingsStore.saveSettings(full);
        success(copyTarget.value === 'page' ? 'Page copy saved.' : 'Shoebox intro saved.');
        copyEditorOpen.value = false;
      } catch (e: any) {
        error(e?.message || 'Failed to save the page copy.');
      } finally {
        saving.value = false;
      }
    };

    const requiredRules = (fieldName: string) => [
      (v: string) => Boolean((v || '').trim()) || `${fieldName} is required`,
    ];

    return {
      display,
      isAdmin,
      pageTitle,
      defaultPageTitle: DEFAULT_PAGE_TITLE,
      intro,
      cards,
      shoeboxIntro,
      shoebox,
      cardEditorOpen,
      itemEditorOpen,
      copyEditorOpen,
      anyEditorOpen,
      cardEditorTitle,
      itemEditorTitle,
      copyEditorTitle,
      cardIndex,
      itemIndex,
      cardDraft,
      itemDraft,
      copyTarget,
      copyDraft,
      cardValid,
      itemValid,
      saving,
      busy,
      responseType,
      responseMessage,
      openCardCreate,
      openCardEdit,
      saveCard,
      removeCard,
      openItemCreate,
      openItemEdit,
      saveItem,
      removeItem,
      openPageCopy,
      openShoeboxCopy,
      saveCopy,
      requiredRules,

      linkRules,

      nameRules,

      longTextRules,

    };
  },
});
</script>

<style scoped>
/* General page styling */
.page-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Section styling */
.section {
  margin-bottom: 10px;
  margin-top: 10px;
}

.section h1,
.section h2 {
  margin-bottom: 16px;
  font-weight: 600;
}

/* Discover text styling */
.discover {
  text-decoration: underline;
  cursor: pointer;
  font-weight: 800;
  transition: color 0.3s ease;
}

/* Hidden pages section */
.hidden-pages {
  animation: fadeIn 0.5s ease-in-out;
}

/* Owner-only rows. They wrap so a button never pushes the page sideways at 390px. */
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}

.owner-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  margin-bottom: 12px;
}

/* Owner-only strip above an entry. Right-aligned so it reads as chrome rather than as part of the
   card, and wrapping so an armed delete never widens the column. */
.entry-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  margin-bottom: 0.25rem;
}

.entry-tools__flag {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px dashed rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color));
}

/* Owner-only: a parked entry is dimmed so it reads as "not on the live page" at a glance. */
.entry--parked {
  opacity: 0.55;
}

/* Animation for hidden pages */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}
</style>
