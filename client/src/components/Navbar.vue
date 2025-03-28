<template>
  <div class="c-header">
    <v-row class="d-flex justify-space-between align-center ml-1 mr-1">
      <!-- Logo and Username Section -->
      <v-col md="6" cols="10" class="image pb-0">
        <div class="d-flex align-center">
          <router-link to="/" class="d-flex justify-start align-center">
            <v-img :width="display.mdAndDown.value ? 65 : 80" :height="display.mdAndDown.value ? 65 : 80"
              src="/src/assets/navbar/logo.png" class="mb-3" alt="Logo" title="Want to see my photo? zoom in :P 👀" />
          </router-link>
          <strong class="username">
            <h3 title="Omdanii" :class="{ 'username-title': display.mdAndUp.value }">
              Mahmoud Emad 🎄
            </h3>
            <small class="username-description">
              known as
              <a href="https://github.com/Mahmoud-Emad" target="_blank" title="Mahmoud Emad">@Omdanii</a>
            </small>
          </strong>
        </div>
      </v-col>

      <!-- Search Section -->
      <v-col xxl="4" xl="4" lg="4" md="4" cols="2" class="search d-flex justify-end">
        <div class="search-container d-flex align-center">
          <input v-if="display.mdAndUp.value" type="text" placeholder="Search..." class="c-search"
            title="What goes around comes around 🧞‍♀️" />
          <div class="c-nav-search-btn" :style="{ padding: display.mdAndUp.value ? '10px' : '10px' }">
            <v-img src="/src/assets/icons/search.svg" width="15" height="15" title="Think and dig 🎲" />
          </div>
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
    </div>
    <v-progress-linear v-if="apiLoadingStore.isLoading()"
      style="width: 99% !important; border-radius: 3px !important; margin:  0 auto; height: 2px;" color="primary"
      indeterminate></v-progress-linear>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed, watch } from "vue";
import { useDisplay } from "vuetify";
import { useAPILoading, useSettingsStore } from "../store";

// Define interfaces for type safety
interface NavLink {
  name: string;
  link: string;
  title: string;
}

export default defineComponent({
  name: "CustomNavbar",
  setup() {
    // Vuetify display utility
    const display = useDisplay();

    // State
    const navbarClicked = ref(false);
    const apiLoadingStore = useAPILoading()
    const activeLink = ref("/");
    const navbarHeight = ref(40);
    const adminDashboard = ref(false);

    // Store
    const settingsStore = useSettingsStore();

    // Navigation Links Configuration
    const navBarLinks = ref<NavLink[]>([
      { name: "❄️ About", link: "/", title: "About me" },
      { name: "📞 Contact", link: "/contact", title: "Contact me" },
      { name: "🎨 Projects", link: "/projects", title: "See my projects" },
      { name: "✍️ Blog", link: "/blog", title: "See my blog" },
      { name: "🧁 Guestbook", link: "/guestbook", title: "Write me a guestbook" },
      { name: "🌏 More", link: "/more", title: "Wanna to see more?" },
    ]);

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

    // Lifecycle Hooks
    onMounted(async () => {
      activeLink.value =
        window.location.pathname.length > 0 ? window.location.pathname : "/";

      const serverUrl = import.meta.env.VITE_SERVER_URL;
      if (!serverUrl) {
        throw new Error("VITE_SERVER_URL is not defined");
      }

      try {
        const url = new URL(serverUrl);
        settingsStore.server.host = url.hostname;
        settingsStore.server.port =
          Number(url.port) || (url.protocol === "https:" ? 443 : 80);

        await settingsStore.loadSettings();
        adminDashboard.value =
          settingsStore.getSettings().configuration.adminDashboard;
      } catch (error) {
        console.error("Failed to initialize settings:", error);
      }
    });

    // Watchers
    watch(navbarClicked, () => {
      if (display.mdAndUp.value) return;
      navbarHeight.value = navbarClicked.value ? 220 : 40;
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
    };
  },
});
</script>

<style scoped>
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