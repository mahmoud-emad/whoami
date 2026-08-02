<template>
  <div class="page-body contact">
    <header class="contact__head">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p v-if="pageIntro" class="page-intro">{{ pageIntro }}</p>
    </header>

    <!--
      Featured channels get a block of their own with a description. Everything is a loop over
      configuration now: adding Mastodon, Bluesky or a personal site is a settings change, not a
      template change, and an install with nothing configured shows no channels at all.
    -->
    <section class="contact__section" v-for="channel in featuredChannels" :key="channel.key">
      <ContactInfo :title="headingOf(channel)" :description="channel.description" :link="hrefOf(channel)"
        :linkText="channel.linkText" :icon="mdiIconOf(channel)" :cols="display.mdAndUp.value"
        :me="isProfileLink(channel)" />
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
        <li v-for="channel in otherChannels" :key="channel.key" class="row-list__item">
          <a class="row-list__link" :href="hrefOf(channel)" target="_blank" :rel="relOf(channel)">
            <span class="row-list__title">
              <v-icon v-if="mdiIconOf(channel)" size="18" class="mr-1">{{ mdiIconOf(channel) }}</v-icon>
              <span v-else-if="channel.icon" aria-hidden="true" class="mr-1">{{ channel.icon }}</span>
              {{ channel.label }}
            </span>
            <span class="row-list__meta">{{ metaOf(channel) }}</span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, ref, onMounted, onUnmounted, defineComponent } from 'vue';
import ContactInfo from '../components/ContactInfo.vue';
import { useDisplay } from 'vuetify';
import { useSettingsStore } from '../store';
import type { ContactChannel } from '../types';

/** A channel plus the text to print for its link. Internal to this view. */
type RenderChannel = ContactChannel & { key: string, linkText: string };

/** Human-readable form of a URL: no scheme, no trailing slash. Used when nothing better is set. */
const readable = (url: string): string =>
  url.replace(/^mailto:/, '').replace(/^https?:\/\//, '').replace(/\/+$/, '');

export default defineComponent({
  name: 'Contact',
  components: { ContactInfo },
  setup() {
    const display = useDisplay();
    const settingsStore = useSettingsStore();
    const localTime = ref('');

    const profile = computed(() => settingsStore.profile);
    const socials = computed(() => profile.value?.socials);
    const contact = computed(() => profile.value?.contact);
    const page = computed(() => profile.value?.pages?.contact);

    // "Contact" is UI chrome — a page needs a heading — so a built-in default is fine here. The
    // intro is not: an unconfigured site says nothing rather than speaking for its owner.
    const pageTitle = computed(() => page.value?.title?.trim() || 'Contact');
    const pageIntro = computed(() => page.value?.intro?.trim() || contact.value?.intro?.trim() || '');
    const elsewhereIntro = computed(() => contact.value?.elsewhereIntro?.trim() || '');

    /**
     * Channels configured directly. This is the model going forward: any number of channels, in the
     * owner's own order, with their own labels.
     */
    const configuredChannels = computed<RenderChannel[]>(() =>
      (profile.value?.channels || [])
        .filter((c) => c && c.show !== false && c.url?.trim() && c.label?.trim())
        .map((c, index) => ({
          ...c,
          url: c.url.trim(),
          label: c.label.trim(),
          key: `${c.kind || 'channel'}-${index}`,
          // Featured blocks already carry the label as their heading, so the link prints the
          // address itself; compact entries only have the link, so it prints the label.
          linkText: c.featured ? readable(c.url.trim()) : c.label.trim(),
        }))
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

      const list: Array<RenderChannel | null> = [
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

      return list.filter((c): c is RenderChannel => c !== null);
    });

    const channels = computed<RenderChannel[]>(() =>
      configuredChannels.value.length ? configuredChannels.value : legacyChannels.value
    );

    const featuredChannels = computed(() => channels.value.filter((c) => c.featured));
    const otherChannels = computed(() => channels.value.filter((c) => !c.featured));

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
      featuredChannels,
      otherChannels,
      hrefOf,
      headingOf,
      mdiIconOf,
      relOf,
      metaOf,
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

@media (max-width: 600px) {

  .contact__head,
  .contact__section {
    margin-bottom: 1.75rem;
  }
}
</style>
