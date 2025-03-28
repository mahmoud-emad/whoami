<template>
  <div class="page-body">
    <div class="section">
      <h1>Contact</h1>
      <p class="">Do you have any feedback, or just want to go for a chat? Feel free to reach out to me!</p>
    </div>

    <div class="section">
      <!-- E-mail Section -->
      <ContactInfo title="📧 E-mail" :cols="display.mdAndUp.value"
        description="E-mail is the easiest way to reach out to me. Feel free to just write me an e-mail, invite for a chat, or anything else. I’ll likely reply within 48 hours."
        link="mailto:mahmmoud.hassanein@gmail.com" linkText="📧 mahmmoud.hassanein@gmail.com" />
    </div>

    <div class="section">
      <!-- Instant Messaging Section -->
      <ContactInfo title="💬 Instant Messaging"
        description="The second easiest way is to reach me out via an instant messaging platform. I’ve been trying to use Signal more often as it seems to be more secure and private than the alternatives. Therefore, use that if available for you."
        :additionalText="`Note that it is now <strong class='text-info'>${timeInMyTimeZone}</strong> in my timezone, unless I’m traveling.`"
        link="https://signal.me/#eu/SIQSg5rPRWLLAem-ai3ZUM_9o-1_SyNIIy2MZH_68xnXb6h51thCYoiiHu2hEIHy"
        linkText="💬 signal: Omdanii.98" :cols="display.mdAndUp.value" />
    </div>

    <!-- Elsewhere Section -->
    <div class="section mb-2">
      <h2>🌐 Elsewhere</h2>
      <p class="mt-3 mb-3">I can usually be found in most places as @omdanii. Some of the most interesting ones:</p>
      <ContactInfo :link="'https://github.com/Mahmoud-Emad/'" :linkText="'GitHub: @Mahmoud-Emad'" class="mr-2"
        :cols="display.mdAndUp.value" icon="mdi-github" />
      <ContactInfo :link="'https://www.linkedin.com/in/mahmoud-emad-4aa53717a/'" :linkText="'LinkedIn: @mahmoud-emad'"
        class="mr-2" :cols="display.mdAndUp.value" :icon="'mdi-linkedin'" />
      <ContactInfo :link="'https://x.com/Omdanii_'" :linkText="'X: @Omdanii_'" class="mr-2"
        :cols="display.mdAndUp.value" :icon="'mdi-alpha-x-circle'" />

    </div>
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from 'vue';
import ContactInfo from '../components/ContactInfo.vue';
import { useDisplay } from 'vuetify';

export default {
  name: 'CustomContact',
  components: { ContactInfo },
  setup() {
    // Vuetify display utility
    const display = useDisplay();
    const timeInMyTimeZone = ref('');
    const elsewhereLinks = ref([
      { href: '', text: '' },
      { href: '', text: '' },
      { href: '', text: '' },
      // { href: 'https://bsky.app/@omdanii', text: '🔗 Bluesky: @omdanii.com' },
      // { href: 'https://www.reddit.com/user/omdaany/', text: '🔗 Reddit: @Omdanii' }
    ]);

    // Function to update the time (hours and minutes)
    const updateTime = () => {
      const now = new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      timeInMyTimeZone.value = now;
    };

    // Update time every second
    onMounted(() => {
      updateTime(); // Set initial time
      setInterval(updateTime, 1000); // Update every second
    });

    return { timeInMyTimeZone, elsewhereLinks, display };
  }
};
</script>

<style scoped>
.section {
  margin-bottom: 24px;
}

.text-info {
  font-weight: bold;
  color: #00c0ef;
}
</style>
