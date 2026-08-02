<template>
  <div class="c-header">
    <v-row class="d-flex justify-space-between align-center ml-1 mr-1">
      <!-- Logo and Username Section -->
      <v-col md="6" cols="10" class="image pb-0">
        <div class="d-flex align-center">
          <!-- No logo is configured on a fresh install, and there is no sensible stand-in for one:
               a placeholder avatar would put someone else's face on the site. So it is simply
               absent until brand.logoUrl is set. -->
          <router-link v-if="logoSrc" to="/" class="d-flex justify-start align-center">
            <v-img :width="display.mdAndDown.value ? 65 : 80" :height="display.mdAndDown.value ? 65 : 80"
              :src="logoSrc" class="mb-3" :alt="brandDisplayName || 'Logo'" :title="brandDisplayName || 'Home'" />
          </router-link>
          <strong class="username">
            <h3 v-if="brandDisplayName" :title="brandHandle" :class="{ 'username-title': display.mdAndUp.value }">
              {{ brandDisplayName }}
            </h3>
            <small v-if="brandHandle" class="username-description">
              known as
              <a v-if="brandHandleUrl" :href="brandHandleUrl" target="_blank" :title="brandDisplayName">{{ brandHandle
                }}</a>
              <span v-else>{{ brandHandle }}</span>
            </small>
          </strong>
        </div>
      </v-col>

      <!-- Search Section -->
      <v-col v-if="searchEnabled" xxl="4" xl="4" lg="4" md="4" cols="2" class="search d-flex justify-end">
        <!--
          This box had no v-model and no handler, so typing in it did nothing. Enter or the
          button now goes to /search, which queries the collections picked in the dashboard.
        -->
        <div class="search-container d-flex align-center">
          <input v-if="display.mdAndUp.value" v-model="searchQuery" type="text" placeholder="Search..." class="c-search"
            title="Search this site" aria-label="Search this site" @keyup.enter="submitSearch" />
          <button class="c-nav-search-btn" type="button" title="Search" aria-label="Search" @click="submitSearch">
            <v-img :src="searchIcon" width="15" height="15" alt="" />
          </button>
        </div>
      </v-col>
    </v-row>

    <!-- Navigation Links Section -->
    <div @click="openNavbar" :class="[
      'div-navbar',
      'navbar',
      display.mdAndUp.value ? 'normal-navbar' : 'responsive-navbar',
    ]" :style="navbarStyles">
      <v-row>
        <v-col v-for="route in navBarLinks" :key="route.link" xxl="2" xl="2" lg="2" md="2" cols="12" :class="[
          'pa-0',
          'ma-0',
          !display.mdAndUp.value && navbarClicked ? 'responsove-link-hover' : '',
          display.mdAndUp.value
            ? 'text-center'
            : 'd-flex justify-start pa-3',
          { 'pt-1 pb-1': navbarClicked },
        ]">

          <router-link @click="setActiveLink(route.link)" :to="selectedLink(route).link"
            :class="`nav-link-item pa-0 ma-0`" :title="route.title">
            {{ selectedLink(route).name }}
          </router-link>
        </v-col>
      </v-row>

      <!--
        On phones the bar collapses to the current page and the whole strip is the toggle, but
        nothing said so — a visitor could not tell there were other pages behind it. This is the
        affordance.
      -->
      <button v-if="!display.mdAndUp.value" class="navbar-toggle" type="button"
        :aria-expanded="navbarClicked ? 'true' : 'false'" aria-label="Toggle navigation" @click.stop="openNavbar">
        <v-icon size="20">{{ navbarClicked ? 'mdi-chevron-up' : 'mdi-menu' }}</v-icon>
      </button>
    </div>
    <v-progress-linear v-if="apiLoadingStore.isLoading()"
      style="width: 99% !important; border-radius: 3px !important; margin:  0 auto; height: 2px;" color="primary"
      indeterminate></v-progress-linear>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed, watch } from "vue";
import { useDisplay } from "vuetify";
import { useRouter } from "vue-router";
import { useAPILoading, useSettingsStore } from "../store";
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

    // State
    const navbarClicked = ref(false);
    const apiLoadingStore = useAPILoading()
    const activeLink = ref("/");
    const navbarHeight = ref(40);

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

    // Computed Properties
    const navbarStyles = computed(() => ({
      height: `${navbarHeight.value}px !important`,
      cursor: display.mdAndUp.value ? "auto" : "pointer",
    }));

    // Methods
    const selectedLink = (route: NavLink): NavLink => {
      if (navbarClicked.value || display.mdAndUp.value) return route;

      if (activeLink.value === "/") return route;

      const pathSegments = activeLink.value.split("/").filter(Boolean);
      if (pathSegments.length > 0) {
        const routerName = pathSegments[0].toLowerCase();
        const foundLink = navBarLinks.value.find((link) =>
          link.name.toLowerCase().includes(routerName)
        );
        return foundLink ? foundLink : route;
      }
      return route;
    };

    const setActiveLink = (link: string) => {
      activeLink.value = link;
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

    onMounted(() => {
      activeLink.value = window.location.pathname.length > 0 ? window.location.pathname : "/";
    });

    const searchEnabled = computed(() => settingsStore.configuration.enableSearch);

    // Watchers
    watch(navbarClicked, () => {
      if (display.mdAndUp.value) return;
      // Derived from the number of links rather than a fixed 220px, which clipped the last
      // entries once the nav had six items.
      navbarHeight.value = navbarClicked.value ? navBarLinks.value.length * 46 + 12 : 40;
    });

    watch(
      activeLink,
      () => {
        setTimeout(() => {
          const navLinks = document.querySelectorAll(".nav-link-item");
          navLinks.forEach((link) => {
            const linkTo = link.getAttribute("href");
            link.classList.toggle("active", linkTo === activeLink.value);
          });
        }, 50);
      },
      { deep: true }
    );

    watch(display.mdAndUp, () => {
      if (display.mdAndUp.value) {
        navbarClicked.value = false;
        navbarHeight.value = 40;
      }
    }, { deep: true });

    // Return reactive properties and methods
    return {
      navbarClicked,
      navBarLinks,
      navbarHeight,
      display,
      openNavbar,
      selectedLink,
      setActiveLink,
      navbarStyles,
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
/* Menu affordance for the collapsed mobile nav. Positioned against the bar, which is itself the
   click target, so tapping either the icon or the strip opens it. */
.navbar-toggle {
  position: absolute;
  top: 6px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent !important;
  color: rgb(var(--v-theme-gray-color)) !important;
  border-radius: 4px;
}

.navbar-toggle:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link-hover-color));
  outline-offset: 2px;
}

.responsive-navbar {
  position: relative;
}

/* Active link styling */
.active {
  color: rgb(var(--v-theme-link-hover-color)) !important;
}

/* Responsive navbar styling */
.responsive-navbar {
  flex-wrap: wrap;
  padding: 7px !important;
  display: flex !important;
  padding-left: 25px !important;
  padding-right: 25px !important;
}

/* General navbar styling */
.navbar {
  background: transparent !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  background: var(--v-theme-box-bg-color) !important;
  border: 1px solid rgb(var(--v-theme-border-color)) !important;
  border-radius: 6px !important;
  transition: 0.2s;
}

/* Username section styling */
.username {
  line-height: 20px;
}

.username small {
  color: var(--v-theme-gray-color) !important;
}

/* Navbar container */
.div-navbar {
  overflow: hidden;
}

.responsove-link-hover:hover {
  background: rgb(var(--v-theme-border-color)) !important;
  transition: 0.5s;
}

.nav-link-item-bg-hover:hover {
  background: rgb(var(--v-theme-border-color)) !important;
  transition: 0.5s;
}
</style>