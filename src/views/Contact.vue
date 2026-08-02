<template>
  <div class="page-body contact">
    <header class="contact__head">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>

      <!-- Owner-only strip, below the heading rather than wrapping it, so a signed-out page emits
           exactly the markup it did before in-place editing existed. -->
      <div v-if="isAdmin" class="owner-bar">
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a contact channel"
          class="text-capitalize" :disabled="busy" @click="openCreate">Add channel</v-btn>
        <InlineActions label="page copy" :remove="false" @edit="openPageEditor" />
        <v-alert v-if="!editorOpen && !pageEditorOpen && responseMessage" :type="responseType" variant="tonal"
          density="compact" class="owner-bar__alert">{{ responseMessage }}</v-alert>
      </div>

      <p v-if="isAdmin && !channels.length" class="owner-hint">
        No channels yet — add the first one above.
      </p>
    </header>

    <!--
      Featured channels get a block of their own with a description. Everything is a loop over
      configuration now: adding Mastodon, Bluesky or a personal site is a settings change, not a
      template change, and an install with nothing configured shows no channels at all.
    -->
    <section class="contact__section" v-for="channel in featuredChannels" :key="channel.key">
      <div v-if="isAdmin" class="channel-tools">
        <!-- The owner is looking at a channel nobody else can see; say so rather than let it read
             as a rendering bug. -->
        <span v-if="channel.show === false" class="channel-tools__flag">HIDDEN</span>
        <v-btn class="channel-tools__btn" variant="text" density="comfortable" icon="mdi-arrow-up"
          :disabled="busy || !canMove(channel, -1)" title="Move this channel up" aria-label="Move this channel up"
          @click="moveChannel(channel, -1)"></v-btn>
        <v-btn class="channel-tools__btn" variant="text" density="comfortable" icon="mdi-arrow-down"
          :disabled="busy || !canMove(channel, 1)" title="Move this channel down" aria-label="Move this channel down"
          @click="moveChannel(channel, 1)"></v-btn>
        <InlineActions label="channel" @edit="openEdit(channel)" @remove="removeChannel(channel)" />
      </div>

      <ContactInfo :class="{ 'channel--parked': isAdmin && channel.show === false }" :title="headingOf(channel)"
        :description="channel.description" :link="hrefOf(channel)" :linkText="channel.linkText"
        :icon="mdiIconOf(channel)" :cols="display.mdAndUp.value" :me="isProfileLink(channel)" />
    </section>

    <!-- The local-time note is about the person, not about any one channel, so it stands on its
         own instead of being glued to the end of a description. -->
    <p class="contact__section timezone-note" v-if="localTime">
      Note that it is now <strong class="timezone-note__value">{{ localTime }}</strong> in my timezone, unless I’m
      traveling.
    </p>

    <!--
      Elsewhere: a plain list of rows rather than a stack of cards. Label on the left, the address
      itself as muted metadata on the right, one hairline between rows — the same object the search
      results render, so the two pages read as one site.
    -->
    <section class="contact__section" v-if="otherChannels.length">
      <h2 class="section-heading">🌐 Elsewhere</h2>
      <p v-if="elsewhereIntro" class="section-intro">{{ elsewhereIntro }}</p>

      <ul class="row-list">
        <!-- The editing strip is a sibling of the link, not a wrapper around it: signed out the row
             is the single <a> it always was, and only the owner turns the item into a flex row. -->
        <li v-for="channel in otherChannels" :key="channel.key" class="row-list__item"
          :class="{ 'row-list__item--owned': isAdmin }">
          <a class="row-list__link" :class="{ 'channel--parked': isAdmin && channel.show === false }"
            :href="hrefOf(channel)" target="_blank" :rel="relOf(channel)">
            <span class="row-list__title">
              <v-icon v-if="mdiIconOf(channel)" size="18" class="mr-1">{{ mdiIconOf(channel) }}</v-icon>
              <span v-else-if="channel.icon" aria-hidden="true" class="mr-1">{{ channel.icon }}</span>
              {{ channel.label }}
            </span>
            <span class="row-list__meta">{{ metaOf(channel) }}</span>
          </a>

          <div v-if="isAdmin" class="channel-tools channel-tools--row">
            <span v-if="channel.show === false" class="channel-tools__flag">HIDDEN</span>
            <v-btn class="channel-tools__btn" variant="text" density="comfortable" icon="mdi-arrow-up"
              :disabled="busy || !canMove(channel, -1)" title="Move this channel up" aria-label="Move this channel up"
              @click="moveChannel(channel, -1)"></v-btn>
            <v-btn class="channel-tools__btn" variant="text" density="comfortable" icon="mdi-arrow-down"
              :disabled="busy || !canMove(channel, 1)" title="Move this channel down"
              aria-label="Move this channel down" @click="moveChannel(channel, 1)"></v-btn>
            <InlineActions label="channel" @edit="openEdit(channel)" @remove="removeChannel(channel)" />
          </div>
        </li>
      </ul>
    </section>

    <!-- Both dialogs are mounted only for the owner, so a visitor never loads a form at all. -->
    <EditorDialog v-if="isAdmin" v-model="editorOpen" :title="editorTitle">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form v-model="validForm" :disabled="saving">
        <v-row class="ma-0">
          <v-col cols="12" sm="5" class="pa-0 pr-sm-2 mb-4">
            <v-select v-model="draft.kind" :items="kinds" title="Kind" label="Kind" variant="outlined"
              hide-details="auto" density="comfortable"></v-select>
          </v-col>
          <v-col cols="12" sm="7" class="pa-0 pl-sm-2 mb-4">
            <v-text-field v-model="draft.label" :rules="requiredRules('Label')" title="Label" label="Label"
              variant="outlined" hide-details="auto" density="comfortable"
              hint="What the row says, e.g. “@me on GitHub”" persistent-hint></v-text-field>
          </v-col>
        </v-row>
        <!-- No websiteRules(): an e-mail channel stores a bare address, which that pattern rejects. -->
        <v-text-field v-model="draft.url" :rules="requiredRules('URL')" title="URL" label="URL" variant="outlined"
          hide-details="auto"
          :hint="draft.kind === 'email' ? 'Plain address — it is wrapped in mailto: for you' : 'https://…'"
          persistent-hint class="mb-4"></v-text-field>
        <!-- Only a featured channel prints its description, hence the hint rather than a rule. -->
        <v-textarea v-model="draft.description" title="Description" label="Description" variant="outlined"
          hide-details="auto" rows="2" auto-grow hint="Shown under the heading of a featured channel."
          persistent-hint class="mb-4"></v-textarea>
        <v-text-field v-model="draft.icon" title="Icon" label="Icon" placeholder="mdi-github" variant="outlined"
          hide-details="auto" hint="A Material Design Icon name (mdi-github), or an emoji like 📧" persistent-hint
          class="mb-4"></v-text-field>

        <div class="switch-row">
          <v-switch v-model="draft.featured" color="primary" inset hide-details density="compact"
            :label="draft.featured ? 'Featured block' : 'Compact row'"></v-switch>
          <!-- `show` parks a channel without deleting it, which is how the rest of the config models
               optional entries. -->
          <v-switch v-model="draft.show" color="primary" inset hide-details density="compact"
            :label="draft.show ? 'Visible' : 'Hidden'"></v-switch>
        </div>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="editorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving" class="text-capitalize"
          @click="saveChannel">{{ editingIndex === null ? 'Add channel' : 'Save changes' }}</v-btn>
      </template>
    </EditorDialog>

    <EditorDialog v-if="isAdmin" v-model="pageEditorOpen" title="Edit page copy">
      <v-alert v-if="responseMessage" :type="responseType" variant="tonal" density="comfortable" class="mb-4">
        {{ responseMessage }}
      </v-alert>
      <v-form :disabled="saving">
        <v-text-field v-model="pageDraft.title" title="Page Heading" label="Heading" variant="outlined"
          hide-details="auto" hint="Leave empty to fall back to “Contact”." persistent-hint
          class="mb-4"></v-text-field>
        <v-textarea v-model="pageDraft.intro" title="Page Intro" label="Intro paragraph" variant="outlined"
          hide-details="auto" rows="2" auto-grow class="mb-4"></v-textarea>
        <v-textarea v-model="pageDraft.elsewhereIntro" title="Elsewhere Intro" label="Elsewhere intro"
          variant="outlined" hide-details="auto" rows="2" auto-grow
          hint="Sits under the “Elsewhere” heading. Empty drops it." persistent-hint class="mb-4"></v-textarea>
      </v-form>

      <template #actions>
        <v-btn variant="text" :disabled="saving" class="text-capitalize"
          @click="pageEditorOpen = false">Cancel</v-btn>
        <v-btn color="primary" variant="tonal" :loading="saving" :disabled="saving" class="text-capitalize"
          @click="savePageCopy">Save changes</v-btn>
      </template>
    </EditorDialog>
  </div>
</template>

<script lang="ts">
import { computed, ref, onMounted, onUnmounted, defineComponent } from 'vue';
import ContactInfo from '../components/ContactInfo.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import { useDisplay } from 'vuetify';
import { useSettingsStore } from '../store';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone } from '../utils';
import type { ContactChannel } from '../types';

/** A channel plus the text to print for its link. Internal to this view. */
type RenderChannel = ContactChannel & { key: string, linkText: string, index: number };

/** The same thing before it knows its position in the array it will be saved into. */
type DerivedChannel = Omit<RenderChannel, 'index'>;

/** `kind` is a free string in the schema; this is the curated set this page knows how to treat. */
const KINDS = [
  'email',
  'signal',
  'github',
  'linkedin',
  'x',
  'mastodon',
  'bluesky',
  'website',
  'other',
];

const emptyChannel = (): ContactChannel => ({
  kind: 'website',
  label: '',
  url: '',
  description: '',
  icon: '',
  featured: false,
  show: true,
});

/** Merge a stored channel over an empty one, so config written before a field existed still edits. */
const normalise = (channel?: Partial<ContactChannel> | null): ContactChannel => ({
  ...emptyChannel(),
  ...(channel || {}),
});

/** Human-readable form of a URL: no scheme, no trailing slash. Used when nothing better is set. */
const readable = (url: string): string =>
  url.replace(/^mailto:/, '').replace(/^https?:\/\//, '').replace(/\/+$/, '');

export default defineComponent({
  name: 'Contact',
  components: { ContactInfo, EditorDialog, InlineActions },
  setup() {
    const display = useDisplay();
    const settingsStore = useSettingsStore();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();
    const localTime = ref('');

    // In-place editing state. `editingIndex === null` means the dialog is adding a new channel.
    const editorOpen = ref(false);
    const pageEditorOpen = ref(false);
    const editingIndex = ref<number | null>(null);
    const draft = ref<ContactChannel>(emptyChannel());
    const pageDraft = ref({ title: '', intro: '', elsewhereIntro: '' });
    const validForm = ref(false);
    const saving = ref(false);
    // Set while any write is in flight. Reorder and delete have no dialog of their own, so this is
    // what stops a second click landing before the first round trip has come back.
    const busy = ref(false);

    const profile = computed(() => settingsStore.profile);
    const socials = computed(() => profile.value?.socials);
    const contact = computed(() => profile.value?.contact);
    const page = computed(() => profile.value?.pages?.contact);

    const editorTitle = computed(() => (editingIndex.value === null ? 'Add channel' : 'Edit channel'));

    // "Contact" is UI chrome — a page needs a heading — so a built-in default is fine here. The
    // intro is not: an unconfigured site says nothing rather than speaking for its owner.
    const pageTitle = computed(() => page.value?.title?.trim() || 'Contact');
    const pageIntro = computed(() => page.value?.intro?.trim() || contact.value?.intro?.trim() || '');
    const elsewhereIntro = computed(() => contact.value?.elsewhereIntro?.trim() || '');

    /**
     * Channels configured directly. This is the model going forward: any number of channels, in the
     * owner's own order, with their own labels.
     *
     * Mapped before it is filtered so `index` is the position in settings — that is what the
     * editing controls address. The owner also sees parked and half-written channels, because a
     * hidden channel that never renders could otherwise never be brought back from the page itself.
     */
    const configuredChannels = computed<RenderChannel[]>(() =>
      (profile.value?.channels || [])
        .map((c, index) => {
          const url = (c?.url || '').trim();
          const label = (c?.label || '').trim();
          return {
            ...normalise(c),
            url,
            label,
            index,
            key: `${c?.kind || 'channel'}-${index}`,
            // Featured blocks already carry the label as their heading, so the link prints the
            // address itself; compact entries only have the link, so it prints the label.
            linkText: c?.featured ? readable(url) : label,
          };
        })
        .filter((c) => isAdmin.value || (c.show !== false && c.url && c.label))
    );

    /**
     * Backwards compatibility: installs configured before `channels` existed still have their
     * details in profile.socials / profile.contact. Those are mapped to channels at runtime so
     * upgrading does not empty someone's contact page. Nothing here invents a value — every field
     * is dropped when its source is empty.
     */
    const legacyChannels = computed<RenderChannel[]>(() => {
      const s = socials.value;
      const c = contact.value;
      if (!s) return [];

      const list: Array<DerivedChannel | null> = [
        s.email?.trim()
          ? {
            kind: 'email',
            label: 'E-mail',
            url: s.email.trim(),
            description: c?.emailDescription?.trim() || '',
            icon: '📧',
            featured: true,
            show: true,
            key: 'legacy-email',
            linkText: c?.emailLabel?.trim() || s.email.trim(),
          }
          : null,
        s.signalUrl?.trim()
          ? {
            kind: 'signal',
            label: 'Instant Messaging',
            url: s.signalUrl.trim(),
            description: c?.signalDescription?.trim() || '',
            icon: '💬',
            featured: true,
            show: true,
            key: 'legacy-signal',
            linkText: c?.signalLabel?.trim() || readable(s.signalUrl.trim()),
          }
          : null,
        s.githubUrl?.trim()
          ? {
            kind: 'github',
            label: c?.githubLabel?.trim() || 'GitHub',
            url: s.githubUrl.trim(),
            description: '',
            icon: 'mdi-github',
            featured: false,
            show: true,
            key: 'legacy-github',
            linkText: c?.githubLabel?.trim() || 'GitHub',
          }
          : null,
        s.linkedinUrl?.trim()
          ? {
            kind: 'linkedin',
            label: c?.linkedinLabel?.trim() || 'LinkedIn',
            url: s.linkedinUrl.trim(),
            description: '',
            icon: 'mdi-linkedin',
            featured: false,
            show: true,
            key: 'legacy-linkedin',
            linkText: c?.linkedinLabel?.trim() || 'LinkedIn',
          }
          : null,
        s.xUrl?.trim()
          ? {
            kind: 'x',
            label: c?.xLabel?.trim() || 'X',
            url: s.xUrl.trim(),
            description: '',
            icon: 'mdi-alpha-x-circle',
            featured: false,
            show: true,
            key: 'legacy-x',
            linkText: c?.xLabel?.trim() || 'X',
          }
          : null,
      ];

      // Indexed only after the empties are dropped, so `index` lines up with the array
      // `channelSource()` materialises from this very list.
      return list
        .filter((c): c is DerivedChannel => c !== null)
        .map((c, index) => ({ ...c, index }));
    });

    /** True once there is something real in `profile.channels`; false means the fallback is showing. */
    const usingConfigured = computed(() => configuredChannels.value.length > 0);

    const channels = computed<RenderChannel[]>(() =>
      usingConfigured.value ? configuredChannels.value : legacyChannels.value
    );

    const featuredChannels = computed(() => channels.value.filter((c) => c.featured));
    const otherChannels = computed(() => channels.value.filter((c) => !c.featured));

    /** Strip the render-only fields, leaving exactly what `profile.channels` stores. */
    const toPlain = (channel: RenderChannel): ContactChannel => ({
      kind: channel.kind,
      label: channel.label,
      url: channel.url,
      description: channel.description,
      icon: channel.icon,
      featured: channel.featured,
      show: channel.show,
    });

    /**
     * Editable copy of the array the page is rendering from, unfiltered and in settings order, so
     * saving one channel can never drop an incomplete neighbour.
     *
     * When the page is still running off the legacy fallback, the derived channels are materialised
     * here. That is deliberate: the first save from this page writes a real `channels` array, and
     * from then on `configuredChannels` wins, so the derived fallback is never consulted again and
     * an edit cannot be shadowed by the profile.socials fields it was derived from.
     */
    const channelSource = (): ContactChannel[] => {
      const base = usingConfigured.value
        ? (settingsStore.profile?.channels || [])
        : legacyChannels.value.map(toPlain);
      return (deepClone(base) as ContactChannel[]).map((c) => normalise(c));
    };

    /**
     * Contact channels are not a collection of their own — they are one array inside site settings,
     * so there is no `/channels` endpoint to POST to. Only the `profile.channels` slice is written
     * back, which is what stops this from clobbering whatever another form last saved.
     */
    const commit = async (next: ContactChannel[], okMessage: string, failMessage: string) => {
      try {
        busy.value = true;
        const full = settingsStore.getSettings();
        full.profile = { ...full.profile, channels: next };
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

    const openCreate = () => {
      clear();
      editingIndex.value = null;
      draft.value = emptyChannel();
      editorOpen.value = true;
    };

    const openEdit = (channel: RenderChannel) => {
      clear();
      const source = channelSource()[channel.index];
      if (!source) return;
      // Clone so typing in the dialog does not rewrite the channel behind it before anything is saved.
      editingIndex.value = channel.index;
      draft.value = normalise(deepClone(source));
      editorOpen.value = true;
    };

    const saveChannel = async () => {
      const next = channelSource();
      const isNew = editingIndex.value === null;
      const channel = normalise(deepClone(draft.value));
      channel.url = channel.url.trim();
      channel.label = channel.label.trim();
      channel.icon = channel.icon.trim();

      // Appending when the index no longer exists: the settings document could have been rewritten
      // elsewhere while the dialog was open, and writing past the end would leave a hole.
      if (isNew || editingIndex.value! >= next.length) next.push(channel);
      else next[editingIndex.value!] = channel;

      saving.value = true;
      const ok = await commit(next, isNew ? 'Channel added.' : 'Channel updated.', 'Failed to save the channel.');
      saving.value = false;
      if (ok) editorOpen.value = false;
    };

    const removeChannel = async (channel: RenderChannel) => {
      const next = channelSource();
      if (channel.index < 0 || channel.index >= next.length) return;
      next.splice(channel.index, 1);
      await commit(next, 'Channel deleted.', 'Failed to delete the channel.');
    };

    /**
     * Featured channels and compact rows are two separate lists on screen, so "up" means the entry
     * above it in the list the owner is looking at — not the previous element of the flat array,
     * which is usually in the other group and would make the button do nothing visible.
     */
    const neighbourOf = (channel: RenderChannel, delta: number): RenderChannel | undefined => {
      const group = channel.featured ? featuredChannels.value : otherChannels.value;
      const at = group.findIndex((c) => c.index === channel.index);
      return at === -1 ? undefined : group[at + delta];
    };

    const canMove = (channel: RenderChannel, delta: number): boolean =>
      Boolean(neighbourOf(channel, delta));

    /** Swap with that neighbour; array position is the render order, so this is the whole reorder. */
    const moveChannel = async (channel: RenderChannel, delta: number) => {
      const neighbour = neighbourOf(channel, delta);
      if (!neighbour) return;
      const next = channelSource();
      if (!next[channel.index] || !next[neighbour.index]) return;
      [next[channel.index], next[neighbour.index]] = [next[neighbour.index], next[channel.index]];
      await commit(next, 'Order updated.', 'Failed to reorder the channels.');
    };

    const openPageEditor = () => {
      clear();
      // Seeded from what the page is actually showing, so an intro still living in the legacy
      // profile.contact.intro field is carried over rather than silently replaced by an empty box.
      pageDraft.value = {
        title: page.value?.title || '',
        intro: pageIntro.value,
        elsewhereIntro: contact.value?.elsewhereIntro || '',
      };
      pageEditorOpen.value = true;
    };

    const savePageCopy = async () => {
      try {
        saving.value = true;
        const full = settingsStore.getSettings();
        full.profile = {
          ...full.profile,
          // Only this page's entry is replaced, so the copy of every other page is left alone.
          pages: {
            ...full.profile.pages,
            contact: {
              title: pageDraft.value.title.trim(),
              intro: pageDraft.value.intro.trim(),
            },
          },
          // The intro used to live at profile.contact.intro and is still read as a fallback. It is
          // moved into pages.contact.intro and the old field cleared, so there is one source of
          // truth — otherwise clearing the intro here would make the legacy paragraph reappear.
          contact: {
            ...full.profile.contact,
            intro: '',
            elsewhereIntro: pageDraft.value.elsewhereIntro.trim(),
          },
        };
        await settingsStore.saveSettings(full);
        success('Page copy saved.');
        pageEditorOpen.value = false;
      } catch (e: any) {
        error(e?.message || 'Failed to save the page copy.');
      } finally {
        saving.value = false;
      }
    };

    /** mailto: for e-mail, https:// added when a bare domain was configured. */
    const hrefOf = (channel: RenderChannel): string => {
      const url = channel.url;
      if (channel.kind === 'email') return `mailto:${url.replace(/^mailto:/, '')}`;
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
      return `https://${url}`;
    };

    /**
     * rel="me" claims "this profile is also me", which is how IndieWeb consumers and IndieAuth
     * verify identity. It only makes sense on a profile page on another site: a mailto: address
     * is not a page that can link back, so it is excluded.
     */
    const isProfileLink = (channel: { kind?: string, url?: string }): boolean => {
      if (!channel || channel.kind === 'email') return false;
      const url = (channel.url || '').trim();
      return /^https?:\/\//i.test(url) || /^[\w-]+\.[\w.-]+/.test(url);
    };

    /** rel for a row rendered here rather than by ContactInfo. Same rule as the card's. */
    const relOf = (channel: RenderChannel): string =>
      isProfileLink(channel) ? 'me noopener' : 'noopener';

    /**
     * The muted right-hand column of an "Elsewhere" row. The row's title is the label ("GitHub"),
     * so the address itself is the metadata — the equivalent of the date on an article row.
     */
    const metaOf = (channel: RenderChannel): string => readable(channel.url);

    /** Emoji icons belong in the heading; mdi icons are rendered inside the card by ContactInfo. */
    const isMdi = (icon?: string) => Boolean(icon && icon.startsWith('mdi-'));
    const mdiIconOf = (channel: RenderChannel) => (isMdi(channel.icon) ? channel.icon : undefined);
    const headingOf = (channel: RenderChannel) =>
      isMdi(channel.icon) || !channel.icon ? channel.label : `${channel.icon} ${channel.label}`;

    /** Required-field rule. Not websiteRules(): an e-mail channel stores a bare address. */
    const requiredRules = (fieldName: string) => [
      (v: string) => Boolean((v || '').trim()) || `${fieldName} is required`,
    ];

    const timezone = computed(() => socials.value?.timezone?.trim() || '');

    const updateTime = () => {
      if (!timezone.value) {
        localTime.value = '';
        return;
      }
      try {
        localTime.value = new Date().toLocaleString('en-US', {
          timeZone: timezone.value,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      } catch {
        // A misconfigured timezone throws a RangeError; drop the note rather than the page.
        localTime.value = '';
      }
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
      updateTime();
      intervalId = setInterval(updateTime, 1000);
    });

    onUnmounted(() => {
      if (intervalId) clearInterval(intervalId);
    });

    return {
      isProfileLink,
      display,
      localTime,
      pageTitle,
      pageIntro,
      elsewhereIntro,
      channels,
      featuredChannels,
      otherChannels,
      hrefOf,
      headingOf,
      mdiIconOf,
      relOf,
      metaOf,
      isAdmin,
      editorOpen,
      editorTitle,
      pageEditorOpen,
      editingIndex,
      draft,
      pageDraft,
      validForm,
      saving,
      busy,
      kinds: KINDS,
      responseType,
      responseMessage,
      openCreate,
      openEdit,
      saveChannel,
      removeChannel,
      canMove,
      moveChannel,
      openPageEditor,
      savePageCopy,
      requiredRules,
    };
  },
});
</script>

<style scoped>
.contact {
  /* Nothing inside may be wider than the column, whatever a channel URL turns out to be. */
  min-width: 0;
}

.contact__head {
  margin-bottom: 2.25rem;
}

/* One gap between sections rather than a mix of .section, mb-2 and mb-4. */
.contact__section {
  margin-bottom: 2.25rem;
}

.contact__section:last-child {
  margin-bottom: 0;
}

/* ContactInfo carries its own bottom margin for pages that drop it into a grid (More); here the
   section already provides the gap, so the two must not stack. */
.contact__section .contact-info {
  margin-bottom: 0;
}

.timezone-note {
  line-height: 1.7;
  color: rgb(var(--v-theme-gray-color));
}

/* Was a hardcoded #00c0ef, which is a fixed cyan that ignored the theme entirely — invisible-ish
   on white, off-palette on navy. The accent colour is theme-aware and already carries every other
   "live value" on the site. */
.timezone-note__value {
  font-family: var(--font-mono);
  font-weight: 600;
  color: rgb(var(--v-theme-link-hover-color));
}

/* Owner-only row under the page intro. Wraps so the button never pushes the page sideways. */
.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}

.owner-hint {
  margin-top: 0.75rem !important;
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
}

/* Owner-only strip above a featured block. Right-aligned so it reads as chrome rather than as part
   of the channel, and wrapping so an armed delete never widens the page at 390px. */
.channel-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  margin-bottom: 0.35rem;
}

.channel-tools__btn.v-btn {
  width: 40px;
  height: 40px;
  min-width: 40px;
  color: rgb(var(--v-theme-text-color));
  opacity: 0.55;
}

.channel-tools__btn.v-btn:hover,
.channel-tools__btn.v-btn:focus-visible {
  opacity: 1;
}

.channel-tools__flag {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px dashed rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color));
}

/* Only the owner turns an "Elsewhere" row into a flex row; signed out it is the bare <a> it was.
   The controls sit at the end and drop onto their own line once the link needs the width. */
.row-list__item--owned {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 0.5rem;
}

.row-list__item--owned .row-list__link {
  flex: 1 1 200px;
  min-width: 0;
}

.row-list__item--owned .channel-tools--row {
  margin-bottom: 0;
  margin-left: auto;
}

/* Owner-only: a parked channel is dimmed so it reads as "not on the live page" at a glance. */
.channel--parked {
  opacity: 0.55;
}

/* Dialog: switches side by side on a wide screen, stacked once there is no room. */
.switch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.5rem;
}

@media (max-width: 600px) {

  .contact__head,
  .contact__section {
    margin-bottom: 1.75rem;
  }
}
</style>
