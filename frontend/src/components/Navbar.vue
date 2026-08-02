<template>
  <header class="c-header">
    <!--
      Plain flexbox rather than v-row / v-col. Vuetify's grid carries negative margins that the
      nav strip below does not, so the brand block and the nav could never share a left edge no
      matter what padding was applied. One layout system, one set of edges.
    -->
    <div class="nav-top">
      <!--
        Signed in, the avatar doubles as the account control: hovering or focusing it reveals a
        sign out button over the corner. Visitors see an ordinary link home, with no hint that an
        account exists.
      -->
      <div v-if="logoSrc" class="nav-brand__avatar" :class="{ 'nav-brand__avatar--admin': isAdmin }">
        <router-link to="/" class="nav-brand__logo">
          <v-img :src="logoSrc" :alt="brandDisplayName || 'Logo'" :title="brandDisplayName || 'Home'" cover />
        </router-link>
        <button v-if="isAdmin" class="nav-signout" type="button" title="Sign out" aria-label="Sign out"
          :disabled="signingOut" @click.stop="signOut">
          <v-icon size="16">mdi-logout</v-icon>
        </button>
      </div>

      <div class="nav-brand__text">
        <h3 v-if="brandDisplayName" class="nav-brand__name" :title="brandHandle">{{ brandDisplayName }}</h3>
        <small v-if="brandHandle" class="nav-brand__handle">
          known as
          <a v-if="brandHandleUrl" :href="brandHandleUrl" target="_blank" rel="me noopener"
            :title="brandDisplayName">{{ brandHandle }}</a>
          <span v-else>{{ brandHandle }}</span>
        </small>
      </div>

      <div v-if="searchEnabled" class="nav-search">
        <input v-if="display.mdAndUp.value" v-model="searchQuery" type="text" placeholder="Search..." class="c-search"
          title="Search this site" aria-label="Search this site" @keyup.enter="submitSearch" />
        <button class="c-nav-search-btn" type="button" title="Search" aria-label="Search" @click="submitSearch">
          <v-img :src="searchIcon" width="15" height="15" alt="" />
        </button>
      </div>
    </div>

    <!--
      The open height used to be computed in JavaScript and written as an inline style, which is
      what left the dead space above and below the links when expanded. CSS sizes it now.
    -->
    <nav class="nav-bar" :class="{ 'nav-bar--open': navbarClicked }" aria-label="Site">
      <ul class="nav-list">
        <li v-for="item in visibleNavItems" :key="item.link" class="nav-list__item">
          <router-link :to="item.link" class="nav-link-item" :class="{ active: isActive(item.link) }"
            :title="item.title" :aria-current="isActive(item.link) ? 'page' : undefined" @click="closeNavbar">
            {{ item.name }}
          </router-link>
        </li>
      </ul>

      <!-- Collapsed, the bar shows only the current page, so this says there is more behind it. -->
      <button v-if="!display.mdAndUp.value" class="nav-toggle" type="button"
        :aria-expanded="navbarClicked ? 'true' : 'false'" aria-label="Toggle navigation" @click="openNavbar">
        <v-icon size="20">{{ navbarClicked ? 'mdi-chevron-up' : 'mdi-menu' }}</v-icon>
      </button>
    </nav>

    <v-progress-linear v-if="apiLoadingStore.isLoading()" class="nav-progress" color="primary" height="2"
      indeterminate></v-progress-linear>
  </header>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useDisplay } from "vuetify";
import { useRoute, useRouter } from "vue-router";
import { useAPILoading, useSettingsStore } from "../store";
import { useAdmin } from "../composables/useAdmin";
import { logout } from "../utils/api";
// Imported rather than referenced by path so Vite bundles and fingerprints them. A literal
// "/src/assets/..." src only resolves under the dev server and 404s in a production build.
import searchIcon from "../assets/icons/search.svg";

// Define interfaces for type safety
interface NavLink {
  name: string;
  link: string;
  title: string;
}

export default defineComponent({
  name: "Navbar",
  setup() {
    // Vuetify display utility
    const display = useDisplay();
    const router = useRouter();
    const route = useRoute();
    const { isAdmin, markSignedOut } = useAdmin();
    const signingOut = ref(false);

    const signOut = async () => {
      signingOut.value = true;
      try {
        await logout();
        markSignedOut();
        // Home rather than staying put: half the page's controls vanish on sign out, and landing
        // somewhere stable reads better than watching them disappear around you.
        router.push('/');
      } finally {
        signingOut.value = false;
      }
    };

    // State
    const navbarClicked = ref(false);
    const apiLoadingStore = useAPILoading()

    // Store
    const settingsStore = useSettingsStore();

    // Generic page chrome, not identity: used before settings load and when an owner has not
    // customised the nav. A portfolio with no navigation is broken, so this default stays.
    const DEFAULT_NAV_ITEMS: NavLink[] = [
      { name: "❄️ About", link: "/", title: "About me" },
      { name: "📞 Contact", link: "/contact", title: "Contact me" },
      { name: "🎨 Projects", link: "/projects", title: "See my projects" },
      { name: "✍️ Blog", link: "/blog", title: "See my blog" },
      { name: "🧁 Guestbook", link: "/guestbook", title: "Write me a guestbook" },
      { name: "🌏 More", link: "/more", title: "Wanna to see more?" },
    ];

    const brand = computed(() => (settingsStore.isSettingsLoaded() ? settingsStore.profile?.brand : undefined));

    // Everything about the brand comes from settings. Nothing falls back to a person's name, handle
    // or profile URL: an unconfigured clone must not advertise whoever set the template up first.
    // Empty values are rendered as nothing at all (see the v-ifs in the template).
    const brandDisplayName = computed(() => brand.value?.displayName?.trim() || '');
    const brandHandle = computed(() => brand.value?.handle?.trim() || '');
    const brandHandleUrl = computed(() => brand.value?.handleUrl?.trim() || '');
    const logoSrc = computed(() => brand.value?.logoUrl?.trim() || '');

    const navBarLinks = computed<NavLink[]>(() => {
      const items = brand.value?.navItems;
      if (!items || items.length === 0) return DEFAULT_NAV_ITEMS;
      return items.filter((i) => i.show).map((i) => ({ name: i.name, link: i.link, title: i.title }));
    });

    /**
     * Collapsed on a phone the bar shows only where you are, so it renders that single entry
     * rather than six copies of it. Expanded, or on desktop, it shows the whole list.
     */
    const visibleNavItems = computed<NavLink[]>(() => {
      if (display.mdAndUp.value || navbarClicked.value) return navBarLinks.value;
      const current = navBarLinks.value.find((item) => isActive(item.link));
      return current ? [current] : navBarLinks.value.slice(0, 1);
    });


    /**
     * Which nav entry matches the page being viewed.
     *
     * This used to be tracked in a ref that only changed when a nav link was clicked, and applied
     * by toggling a class on the DOM by hand inside a setTimeout. Any other way of moving between
     * pages (a link in the body, the back button, a redirect) left the highlight on the previous
     * page. Deriving it from the router means it is always right.
     */
    const isActive = (link: string): boolean => {
      if (link === '/') return route.path === '/';
      return route.path === link || route.path.startsWith(`${link}/`);
    };


    const closeNavbar = () => {
      navbarClicked.value = false;
    };

    const openNavbar = () => {
      navbarClicked.value = !navbarClicked.value;
    };

    const searchQuery = ref("");

    // On phones the input is hidden, so the button alone opens the search page and the visitor
    // types there instead.
    const submitSearch = () => {
      const term = searchQuery.value.trim();
      router.push(term ? { path: "/search", query: { q: term } } : { path: "/search" });
      searchQuery.value = "";
    };

    const searchEnabled = computed(() => settingsStore.configuration.enableSearch);



    // Return reactive properties and methods
    return {
      navbarClicked,
      navBarLinks,
      visibleNavItems,
      isActive,
      isAdmin,
      signingOut,
      signOut,
      display,
      openNavbar,
      closeNavbar,
      apiLoadingStore,
      searchEnabled,
      searchQuery,
      submitSearch,
      brandDisplayName,
      brandHandle,
      brandHandleUrl,
      logoSrc,
      searchIcon,
    };
  },
});
</script>

<style scoped>
/* One horizontal rhythm for the whole header. The brand row and the nav strip share this padding,
   which is what makes their left and right edges line up. */
.c-header {
  --nav-inset: 0px;
  background-color: transparent !important;
  color: rgb(var(--v-theme-text-color)) !important;
}

/* ---- brand row ---- */
.nav-top {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.nav-brand__avatar {
  position: relative;
  flex: 0 0 auto;
  line-height: 0;
}

/* The button sits over the avatar's corner rather than beside it, so the header keeps the same
   shape whether or not anyone is signed in. */
.nav-signout {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(var(--v-theme-background)) !important;
  color: rgb(var(--v-theme-gray-color)) !important;
  border: 1px solid rgb(var(--v-theme-border-color));
  opacity: 0;
  transition: opacity .18s ease, color .18s ease, border-color .18s ease;
}

/* Revealed on hover or keyboard focus. On touch there is no hover, so it stays visible there. */
.nav-brand__avatar--admin:hover .nav-signout,
.nav-signout:focus-visible {
  opacity: 1;
}

.nav-signout:hover {
  color: rgb(var(--v-theme-link-hover-color)) !important;
  border-color: rgb(var(--v-theme-link-hover-color));
}

.nav-signout:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
}

@media (hover: none) {
  .nav-brand__avatar--admin .nav-signout {
    opacity: 1;
  }
}

.nav-brand__logo {
  flex: 0 0 auto;
  display: block;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
}

.nav-brand__logo :deep(.v-img) {
  width: 100%;
  height: 100%;
}

.nav-brand__text {
  /* Lets a long name wrap instead of pushing the search button off the row. */
  min-width: 0;
  flex: 1 1 auto;
}

.nav-brand__name {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-text-color)) !important;
  overflow-wrap: anywhere;
}

.nav-brand__handle {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-gray-color));
}

.nav-brand__handle a {
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

.nav-search {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* ---- nav strip ---- */
.nav-bar {
  border: 1px solid rgb(var(--v-theme-border-color));
  border-radius: 8px;
  margin: 0 var(--nav-inset);
  /* Collapsed on mobile the links and the toggle share one row; expanded, the list takes over. */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 0.5rem;
}

.nav-list {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0 !important;
}

.nav-list__item {
  display: flex;
}

.nav-link-item {
  display: flex;
  align-items: center;
  /* 40px keeps every entry a comfortable tap target without a separate mobile rule. */
  min-height: 40px;
  padding: 0 0.6rem;
  font-family: var(--font-mono) !important;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-gray-color)) !important;
  border-radius: 4px;
}

.nav-link-item:hover {
  color: rgb(var(--v-theme-link-hover-color)) !important;
  background: rgba(var(--v-theme-link-hover-color), 0.08);
}

.nav-link-item.active {
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

.nav-link-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: -2px;
}

.nav-toggle {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent !important;
  color: rgb(var(--v-theme-gray-color)) !important;
  border-radius: 4px;
}

.nav-toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: -2px;
}

.nav-progress {
  margin-top: 0.35rem;
  border-radius: 3px;
}

/* ---- mobile ---- */
@media (max-width: 959px) {
  .nav-brand__logo {
    width: 56px;
    height: 56px;
  }

  .nav-brand__name {
    font-size: 1.1rem;
  }

  /* Expanded, the strip becomes a column. Height comes from the content, so there is no dead
     space above or below the links the way there was with a JavaScript-set height. */
  .nav-bar--open {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0.4rem 0.5rem 0.6rem;
  }

  .nav-bar--open .nav-list {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    order: 2;
  }

  .nav-bar--open .nav-list__item {
    width: 100%;
  }

  .nav-bar--open .nav-link-item {
    width: 100%;
    min-height: 44px;
  }

  /* The toggle floats into the corner rather than taking a row of its own, which is what left a
     band of empty space between it and the first link. The links are left aligned text, so the
     only one that could run under it gets clearance. */
  .nav-bar--open {
    position: relative;
  }

  .nav-bar--open .nav-toggle {
    position: absolute;
    top: 0.4rem;
    right: 0.5rem;
  }

  .nav-bar--open .nav-list__item:first-child .nav-link-item {
    padding-right: 3rem;
  }
}
</style>
