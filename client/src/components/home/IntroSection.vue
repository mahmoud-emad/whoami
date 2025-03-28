<template>
  <div class="intro pa-2 text-left">
    <h2>{{ randomMessage }}</h2>
    <p class="text-light-gray">
      Young and dynamic Software Engineer able to work in a multicultural environment with the fast ability to
      learn and expand knowledge & experience to contribute to the overall success of any organization.
    </p>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from 'vue';


export default defineComponent({
  name: 'IntroSection',
  setup() {

    const randomMessage = ref('Hi 👋, I\'m Mahmoud Emad, I\'m a Software Engineer.');

    const welcomeMessages = [
      'Hi 👋, I\'m Mahmoud Emad, I\'m a Software Engineer.',
      'Hi 👋, ich bin Mahmoud Emad, ich bin ein Softwareentwickler.',
      'Hi 👋, je suis Mahmoud Emad, je suis un développeur logiciel.',
    ];

    // Random Message Handling
    const getRandomMessage = () => {
      randomMessage.value = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
      intervalId = setInterval(getRandomMessage, 3000);
    });

    onUnmounted(() => {
      if (intervalId) clearInterval(intervalId);
    });
    return {
      randomMessage
    }
  }

})

</script>

<style scoped>
.intro {
  text-align: center;
  padding: 2rem;
}
</style>