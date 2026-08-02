<template>
  <!-- Nothing configured, nothing rendered: a heading over an empty work history is worse than no
       section at all.
       No `mt-3` and no `pa-2` on the children either: Home.vue already sets the gap between
       sections, and the 8px utility padding indented this body away from its own heading. -->
  <div v-if="visible" class="experience">
    <h2 v-if="heading" class="title" :title="sectionTitle">{{ heading }}</h2>

    <p v-if="intro" class="section-intro">{{ intro }}</p>

    <!--
      Rendered as a service list on purpose: the marker says current or past, and the order is
      time. It carries real information rather than being decoration bolted onto a plain list.
    -->
    <ol class="roles">
      <li v-for="(role, index) in roles" :key="`${role.org}-${index}`" class="role"
        :class="{ 'role--active': role.active }">
        <span class="role__marker" aria-hidden="true"></span>

        <div class="role__head">
          <span class="role__org">{{ role.org }}</span>
          <span class="role__state">{{ role.active ? 'RUNNING' : 'STOPPED' }}</span>
          <span class="role__period">{{ role.period }}</span>
        </div>

        <p class="role__title">{{ role.title }}<span v-if="role.where" class="role__where"> · {{ role.where }}</span>
        </p>

        <ul v-if="role.points && role.points.length" class="role__points">
          <li v-for="(point, i) in role.points" :key="i">{{ point }}</li>
        </ul>
      </li>
    </ol>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useSettingsStore } from '../../store';
import type { ExperienceRole } from '../../types';
import { sectionHeading } from '../../utils';

export default defineComponent({
  name: 'ExperienceSection',
  setup() {
    const settingsStore = useSettingsStore();

    const section = computed(() => settingsStore.profile?.sections?.experience);
    const heading = computed(() => sectionHeading(section.value));
    const sectionTitle = computed(() => section.value?.title?.trim() || '');
    const intro = computed(() => section.value?.intro?.trim() || '');

    /**
     * The work history used to be a hardcoded array of one person's jobs. It now comes from
     * settings. `show === false` parks a role without deleting it, which is how the rest of the
     * config models optional entries.
     */
    const roles = computed<ExperienceRole[]>(() =>
      (settingsStore.profile?.experience || []).filter((role) => role && role.show !== false)
    );

    const visible = computed(() => section.value?.show !== false && roles.value.length > 0);

    return { roles, visible, heading, sectionTitle, intro };
  },
});
</script>

<style scoped>
.experience {
  min-width: 0;
}

.roles {
  list-style: none;
  margin: 0;
  padding-left: 0 !important;
}

.role {
  position: relative;
  padding-left: 1.5rem;
  padding-bottom: 1.75rem;
}

.role:last-child {
  padding-bottom: 0;
}

/* The rail that links the markers — the supervision-tree read. */
.role::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 1.1rem;
  bottom: -0.25rem;
  width: 1px;
  background: rgb(var(--v-theme-border-color));
}

.role:last-child::before {
  display: none;
}

.role__marker {
  position: absolute;
  left: 0;
  top: 0.45rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgb(var(--v-theme-gray-color));
  background: transparent;
}

.role--active .role__marker {
  border-color: rgb(var(--v-theme-link-hover-color));
  background: rgb(var(--v-theme-link-hover-color));
  box-shadow: 0 0 0 3px rgba(var(--v-theme-link-hover-color), 0.18);
}

.role__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}

.role__org {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  /* A long organisation name is one unbroken string in mono; without these it widens the row and
     the whole page scrolls sideways on a phone. */
  min-width: 0;
  overflow-wrap: anywhere;
}

.role__state {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid rgb(var(--v-theme-border-color));
  color: rgb(var(--v-theme-gray-color));
}

.role--active .role__state {
  color: rgb(var(--v-theme-link-hover-color));
  border-color: rgba(var(--v-theme-link-hover-color), 0.45);
}

.role__period {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: rgb(var(--v-theme-gray-color));
  margin-left: auto;
}

.role__title {
  margin-top: 0.35rem !important;
  font-weight: 600;
  font-size: 0.95rem;
  color: rgb(var(--v-theme-text-color));
}

.role__where {
  font-weight: 400;
  color: rgb(var(--v-theme-gray-color));
}

.role__points {
  margin: 0.5rem 0 0 0;
  padding-left: 1.05rem;
}

.role__points li {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  line-height: 1.65;
  margin-bottom: 0.3rem;
}

@media (max-width: 600px) {
  .role__period {
    margin-left: 0;
    width: 100%;
  }

  .role__points li {
    font-size: 0.875rem;
  }
}
</style>
