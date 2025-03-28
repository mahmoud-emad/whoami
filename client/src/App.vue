<script setup lang="ts">
import ContainerLayout from "./layouts/ContainerLayout.vue";
</script>

<template>
  <ContainerLayout>
    <template v-slot:layout-child>
      <RouterView />
    </template>
  </ContainerLayout>
</template>
