<template>
  <!-- Problem Solving -->
  <div class="problem-solving mt-3" v-if="settingsStore.isSettingsLoaded()">
    <h2 class="title" title="Problem Solving">🧠 Problem Solving</h2>
    <div class="pa-2">
      <p class="text-light-gray">
        I have a strong passion for problem-solving and I'm always looking for new challenges to
        tackle.
        I'm a quick learner and I'm always eager to learn new things.
      </p>
      <p class="text-light-gray">
        Would you like to challenge me? open an issue on my
        <a style="font-family: system-ui !important; text-decoration: underline"
          href="https://github.com/Mahmoud-Emad/Problem-solving-LeetCode" target="_blank">
          GitHub Leetcode
        </a>
        repo.
      </p>
    </div>
  </div>
  <!-- <div class="long-line opacity-80 mt-2 mb-2"></div> -->
</template>

<script lang="ts">
import { useSiteSettingsStore } from '../../store';

export default {
  name: 'ProblemSolvingSection',
  setup() {
    const settingsStore = useSiteSettingsStore();
    return {
      settingsStore
    };
  },
};
</script>

<style scoped>
.v-btn {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}
</style>