<template>
  <div class="page-body">
    <!-- Introduction Section -->
    <section class="section">
      <h1>What Else Can I Find?</h1>
      <p>
        This website contains more things than it looks at first glance. This page contains a list of every page that I
        deem important that is not on the main navigation. However, it does not show everything. Some things are up for
        you to
        <span :style="{ color: `rgb(${discoverColor})` }" @click="toggleDiscover" @keydown.enter="toggleDiscover"
          class="discover" role="button" tabindex="0" aria-label="Toggle discover mode">
          discover
        </span>!
      </p>
    </section>

    <div class="long-line opacity-80 mt-2 mb-2"></div>

    <!-- Additional Pages Section (Hidden Pages) -->
    <!-- v-if="discoverClicked"  -->
    <section class="section hidden-pages">
      <v-row>
        <v-col v-for="(page, index) in hiddenPages" :key="index" cols="12" md="6">
          <ContactInfo :title="page.title" :description="page.description" :link="page.link" :linkText="page.linkText"
            :cols="display.mdAndUp.value" :icon="page.icon" />
        </v-col>
      </v-row>
    </section>

    <div class="long-line opacity-80"></div>

    <section class="section">
      <h1>📦 Shoebox</h1>
      <p class="mb-3">
        This section is a sort of digital shoebox, similar to
        <a style="text-decoration: underline; font-family: 'system-ui;" href="https://gilest.org/shoebox.html"
          target="_blank">this one</a>.
        This is a place for
        some things that exist on
        this website, and yet, they don’t have a correct place to be, a home. They’re mostly old experiments from small
        things I did, or small things I wanted to share and keep available.
      </p>

      <v-row>
        <v-col class="pt-0 pb-0" v-for="(item, index) in showBoxItems" :key="index" cols="12" md="4" sm="12" xl="4">
          <ContactInfo :link="item.link" :linkText="item.linkText" :cols="display.mdAndUp.value" :icon="item.icon" />
        </v-col>
      </v-row>

    </section>

    <!-- Admin Fingerprint Section -->
    <div class="main-scope pa-3 ml-4">
      <div class="admin-fingerprint">
        <v-img @click="$router.push('/admin-signature')" @keydown.enter="$router.push('/admin-signature')"
          class="admin-fingerprint-img" src="/src/assets/images/fingerprint.png" alt="Admin Fingerprint"
          title="Click to access admin space" role="button" tabindex="0" aria-label="Access admin space" />
        <small class="admin-signature">Admin's space</small>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onUnmounted, watch } from "vue";
import { useDisplay } from "vuetify";
import ContactInfo from "../components/ContactInfo.vue";

// Define interfaces for type safety
interface HiddenPage {
  title: string;
  description: string;
  link: string;
  linkText: string;
  icon?: string;
}
interface ShowBoxItem {
  link: string;
  linkText: string;
  icon?: string;
}

export default defineComponent({
  name: "MoreView",
  components: {
    ContactInfo,
  },
  setup() {
    const display = useDisplay();
    const discoverClicked = ref(false);
    const discoverColor = ref("82, 194, 194");
    const showBoxItems: ShowBoxItem[] = [
      {
        link: 'https://holdonsphare.com',
        linkText: '🌎 Hold on Sphare',
      },
      {
        link: 'https://holdonsphare.com',
        linkText: '📃 StoryMith',
      },
      {
        link: 'https://holdonsphare.com',
        linkText: '⛅️ Weather-JS',
      },
      {
        link: 'https://holdonsphare.com',
        linkText: '♟ Chess Mate',
      },
    ]
    let colorInterval: any = null;

    // Hidden pages to display when discover mode is activated
    const hiddenPages: HiddenPage[] = [
      {
        title: "<p class='text-primary'>📃 Resume</p>",
        description: "The easiest way to view my professional experience is through my resume. You can download it below.",
        link: "/src/assets/resume/mahmoud_emad_software_engineer.pdf",
        linkText: 'Download resume (PDF)',
        icon: '📃'
      },
      {
        title: "<p class='text-primary'>⚒️ Uses</p>",
        description: "A list of tools I sometime use to build and maintain websites.",
        link: "/uses",
        linkText: 'See software uses space',
        icon: '⚒️'
      },
      {
        title: "<p class='text-primary'>🚀 impossible List</p>",
        description: "A simple TODO list built by me to keep track of things I need to do.",
        link: "/impossible-list",
        linkText: 'a bucket list, but with a twist',
        icon: '🚀'
      },
      {
        title: "<p class='text-primary'>🔖 Bookmarks</p>",
        description: "A collection of links for future reference, some of which may be <strong>outdated</strong>.",
        link: "/bookmarks",
        linkText: 'Some links for future reference.',
        icon: '🔖'
      },
    ];

    // Compute the current time in the user's timezone
    const timeInMyTimeZone = computed(() => {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Cairo", // Replace with your timezone
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(new Date());
    });

    // Toggle discover mode and start/stop color change interval
    const toggleDiscover = () => {
      discoverClicked.value = !discoverClicked.value;
      if (discoverClicked.value) {
        startColorChange();
      } else {
        stopColorChange();
        discoverColor.value = "82, 194, 194";
      }
    };

    // Start changing the discover text color randomly
    const startColorChange = () => {
      if (colorInterval) return; // Prevent multiple intervals
      colorInterval = setInterval(() => {
        discoverColor.value = `${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}`;
      }, 1000);
    };

    // Stop changing the discover text color
    const stopColorChange = () => {
      if (colorInterval) {
        clearInterval(colorInterval);
        colorInterval = null;
      }
    };

    // Cleanup interval on component unmount to prevent memory leaks
    onUnmounted(() => {
      stopColorChange();
    });

    // Watch for discoverClicked changes (optional, for debugging)
    watch(discoverClicked, (newValue) => {
      console.log(`Discover mode ${newValue ? "activated" : "deactivated"}`);
    });

    return {
      display,
      discoverClicked,
      discoverColor,
      timeInMyTimeZone,
      hiddenPages,
      showBoxItems,
      toggleDiscover,
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

/* Admin fingerprint styling */
.admin-fingerprint {
  position: relative;
}

.admin-fingerprint-img {
  position: fixed;
  bottom: 45px;
  left: 33px;
  width: 50px;
  height: 50px;
  z-index: 1000;
  cursor: pointer;
  border-radius: 50%;
  opacity: 0.3;
  transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.admin-fingerprint-img:hover {
  opacity: 0.5;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
  transform: scale(1.1);
  background-color: lightskyblue;
}

.admin-signature {
  position: fixed;
  bottom: -40px;
  left: 20px;
  width: 120px;
  height: 80px;
  z-index: 1000;
  opacity: 0.3;
  font-size: 12px;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .admin-fingerprint-img {
    bottom: 20px;
    left: 20px;
    width: 40px;
    height: 40px;
  }

  .admin-signature {
    bottom: -20px;
    left: 10px;
    width: 100px;
    height: 60px;
  }
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