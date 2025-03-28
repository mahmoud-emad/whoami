<template>
  <v-card @mouseleave="resetCardBackground(project)" @mousemove="(e) => changeCardBackground(e, project)"
    class="mx-auto project-card" :style="{ background: project.background + '!important' }" rel="noopener">
    <div class="project-logo">{{ project.title.toLocaleUpperCase() }}</div>
    <h2 style="cursor: pointer; color: var(--v-theme-text-color);" @click="openLink(project)">{{ project.title }}</h2>
    <v-card-text class="ma-0 pa-0 mt-4 mb-4" style="height: 90px;">
      {{
        project.description.length > 200 ? project.description.slice(0, 200) + '...' :
          project.description
      }}
    </v-card-text>
    <div class="mb-2">
      <v-chip-group>
        <v-chip v-for="(tag, tagIndex) in project.tags" :key="tagIndex" :title="tag" :class="getChipClass(tag)">
          {{ tag }}
        </v-chip>
      </v-chip-group>
    </div>
  </v-card>
</template>

<script lang="ts">
import { ProjectType } from '../types';
import { type PropType } from 'vue';


export default {
  name: 'ProjectCard',
  props: {
    project: {
      type: Object as PropType<ProjectType>,
      required: true
    }
  },
  setup() {
    // Handle Card Background Change
    const handleCardBackgroundChange = (e: any, project: ProjectType) => {
      const cardRect = e.currentTarget.getBoundingClientRect();
      const closestSide = getClosestSide(cardRect, e.clientX, e.clientY);
      const position = getSidePosition(closestSide);

      setTimeout(() => {
        project.background = `linear-gradient(to ${position}, transparent, rgb(var(--v-theme-border-color)))`;
      }, 20);
    };

    const resetCardBackground = (project: ProjectType) => {
      setTimeout(() => {
        project.background = 'transparent';
      }, 20);
    };

    // Helper function to calculate the closest side to the mouse position
    const getClosestSide = (rect: DOMRect, mouseX: number, mouseY: number) => {
      const distances = {
        left: mouseX - rect.left,
        right: rect.right - mouseX,
        top: mouseY - rect.top,
        bottom: rect.bottom - mouseY,
      };
      return Object.entries(distances).reduce((closest, [side, dist]) =>
        dist < closest.distance ? { side, distance: dist } : closest, { side: '', distance: Infinity });
    };

    // Helper function to determine side position
    const getSidePosition = (side: { side: string }) => {
      const positionMap = {
        left: 'left',
        right: 'right',
        top: 'top',
        bottom: 'bottom',
      };
      return Reflect.get(positionMap, side.side) || '';
    };

    // Open Project Link
    const openLink = (project: ProjectType) => {
      window.open(project.link, '_blank');
    };

    const getChipClass = (tag: string) => tag === 'Frontend' ? 'chip-front-end' : 'chip-back-end';

    // Handle Card Background Change
    const changeCardBackground = (e: any, project: ProjectType) => {
      const cardElement = e.currentTarget;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const cardRect = cardElement.getBoundingClientRect();

      const distanceToLeft = mouseX - cardRect.left;
      const distanceToRight = cardRect.right - mouseX;
      const distanceToTop = mouseY - cardRect.top;
      const distanceToBottom = cardRect.bottom - mouseY;

      const closestSide = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
      let position = '';
      if (closestSide === distanceToLeft) position = 'left';
      else if (closestSide === distanceToRight) position = 'right';
      else if (closestSide === distanceToTop) position = 'top';
      else if (closestSide === distanceToBottom) position = 'bottom';

      setTimeout(() => {
        project.background = `linear-gradient(to ${position}, transparent, rgb(var(--v-theme-border-color)))`;
      }, 20);
    };

    return {
      handleCardBackgroundChange,
      resetCardBackground,
      changeCardBackground,
      openLink,
      getChipClass,
    };
  }
}
</script>