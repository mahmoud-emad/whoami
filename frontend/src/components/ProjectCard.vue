<template>
  <v-card @mouseleave="resetCardBackground(project)" @mousemove="(e) => changeCardBackground(e, project)"
    class="mx-auto project-card d-flex flex-column"
    :class="{ 'project-card--hidden': editable && project.show === false }"
    :style="{ background: project.background + '!important' }" rel="noopener">
    <div class="project-logo">{{ project.title.toLocaleUpperCase() }}</div>
    <div class="project-card__title">
      <h2 style="cursor: pointer; color: var(--v-theme-text-color);" @click="openLink(project)">{{ project.title }}</h2>
      <!-- Shown to everyone, not just the owner: a project sitting above the others needs to say
           why it is there. -->
      <StatusBadge v-if="project.pinnedAt" label="Pinned" tone="accent" solid icon="mdi-pin"
        title="Pinned to the top" />
    </div>
    <v-card-text class="ma-0 pa-0 mt-4 mb-4" style="min-height: 90px;">
      {{
        project.description
      }}
    </v-card-text>
    <div class="mb-2 mt-auto">
      <v-chip-group>
        <v-chip v-for="(tag, tagIndex) in project.tags" :key="tagIndex" :title="tag" :class="getChipClass(tag)">
          {{ tag }}
        </v-chip>
      </v-chip-group>
    </div>
    <!--
      Owner controls sit on their own row under the tags rather than floating over the card corner:
      the corner already holds the decorative glow, and a row cannot collide with a long title at
      390px. The card never fetches anything itself — it just reports which project was acted on.
    -->
    <div v-if="editable" class="project-card__actions">
      <!-- The owner is looking at a card nobody else can see; say so rather than let the dimming
           read as a rendering fault. -->
      <StatusBadge v-if="project.show === false" label="Hidden" title="Hidden from the public site" />
      <InlineActions label="project" pinnable :pinned="Boolean(project.pinnedAt)" hideable
        :hidden="project.show === false" @edit="$emit('edit', project)" @remove="$emit('remove', project)"
        @toggle-pinned="$emit('toggle-pinned', project)" @toggle-hidden="$emit('toggle-hidden', project)" />
    </div>
  </v-card>
</template>

<script lang="ts">
import { ProjectType } from '../types';
import StatusBadge from '../components/admin/StatusBadge.vue';
import { type PropType } from 'vue';
import InlineActions from './admin/InlineActions.vue';


export default {
  name: 'Card',
  components: { StatusBadge, InlineActions },
  props: {
    project: {
      type: Object as PropType<ProjectType>,
      required: true
    },
    // Set by the page from `isAdmin`. Off by default, so a visitor's card is unchanged.
    editable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['edit', 'remove', 'toggle-pinned', 'toggle-hidden'],
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

<style scoped>
/* A hidden project stays on the page for the owner, dimmed, so it can be brought back from the
   same place it was hidden. Visitors never render it at all. */
.project-card--hidden {
  opacity: 0.55;
}


/* Badge beside the heading rather than under it, so a pinned card is legible at a glance without
   the title losing its own line. */
.project-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.project-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
  border-top: 1px solid rgba(var(--v-theme-border-color), 0.6);
  padding-top: 4px;
}
</style>