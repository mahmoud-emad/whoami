<template>
  <div class="page-body lp">
    <LoadingComponent v-if="apiLoading.isLoading() && !doc" type="article" :content-length="6" content-name="List" />

    <v-alert v-else-if="notFound" class="pa-2 head-card" type="info" variant="tonal">
      That list does not exist. <RouterLink to="/lists">Back to the lists</RouterLink>.
    </v-alert>

    <template v-else-if="doc">
      <header class="lp__head">
        <RouterLink class="lp__back" to="/lists">← All lists</RouterLink>
        <h1 class="page-title">
          <span v-if="doc.emoji" class="lp__emoji" aria-hidden="true">{{ doc.emoji }}</span>{{ doc.title }}
        </h1>
        <p v-if="doc.intro" class="page-intro">{{ doc.intro }}</p>

        <!-- The whole-list progress. A plan in public is only interesting because of this number. -->
        <div class="lp__progress">
          <span class="lp__progress-count">{{ totals.done }} / {{ totals.total }}</span>
          <span class="lp__progress-bar"><span class="lp__progress-fill" :style="{ width: totals.percent + '%' }"></span></span>
          <span class="lp__progress-pct">{{ totals.percent }}%</span>
        </div>

        <div v-if="isAdmin" class="owner-bar">
          <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" title="Add a mission"
            class="text-capitalize" :disabled="busy" @click="openMission(null)">Add mission</v-btn>
          <InlineActions label="list details" :remove="false" @edit="openDetails" />
          <FeedbackNote v-if="!anyDialogOpen && responseMessage" :message="responseMessage" :type="responseType" class="owner-bar__alert" />
        </div>
      </header>

      <!-- The north star, if there is one: what every mission below is in service of. -->
      <blockquote v-if="doc.northStar" class="lp__north">{{ doc.northStar }}</blockquote>

      <p v-if="isAdmin && !doc.missions.length" class="owner-hint">No missions yet. Add the first one above.</p>

      <section v-for="(mission, mIndex) in doc.missions" :key="`m-${mIndex}`" class="lp__mission">
        <div class="lp__mission-head">
          <h2 class="lp__mission-title">
            <span v-if="mission.emoji" class="lp__emoji" aria-hidden="true">{{ mission.emoji }}</span>{{ mission.title }}
          </h2>
          <span class="lp__status" :class="`lp__status--${mission.status}`">{{ STATUS_LABELS[mission.status] }}</span>
          <span class="lp__mission-count">{{ missionDone(mission) }}/{{ missionTotal(mission) }}</span>

          <div v-if="isAdmin" class="lp__tools">
            <v-btn class="lp__tool" variant="text" density="comfortable" icon="mdi-arrow-up" :disabled="busy || mIndex === 0"
              title="Move this mission up" aria-label="Move this mission up" @click="moveMission(mIndex, -1)"></v-btn>
            <v-btn class="lp__tool" variant="text" density="comfortable" icon="mdi-arrow-down"
              :disabled="busy || mIndex === doc.missions.length - 1" title="Move this mission down"
              aria-label="Move this mission down" @click="moveMission(mIndex, 1)"></v-btn>
            <InlineActions label="mission" @edit="openMission(mIndex)" @remove="removeMission(mIndex)" />
          </div>
        </div>

        <div class="lp__mission-bar"><span class="lp__mission-fill" :style="{ width: missionPercent(mission) + '%' }"></span></div>

        <div v-for="(group, gIndex) in mission.groups" :key="`g-${mIndex}-${gIndex}`" class="lp__group">
          <div class="lp__group-head">
            <h3 v-if="group.title" class="lp__group-title">{{ group.title }}</h3>
            <div v-if="isAdmin" class="lp__tools">
              <v-btn class="lp__tool" variant="text" density="comfortable" icon="mdi-plus" :disabled="busy"
                title="Add an item" aria-label="Add an item" @click="openItem(mIndex, gIndex, null)"></v-btn>
              <InlineActions label="group" @edit="openGroup(mIndex, gIndex)" @remove="removeGroup(mIndex, gIndex)" />
            </div>
          </div>

          <ul class="lp__items">
            <li v-for="(item, iIndex) in group.items" :key="`i-${mIndex}-${gIndex}-${iIndex}`" class="lp__item"
              :class="{ 'lp__item--done': item.done }">
              <!--
                Signed out this is a plain marker, not a control: the boxes record what the owner
                has actually done, so a visitor ticking one would turn the page into a fiction.
              -->
              <button v-if="isAdmin" type="button" class="lp__box" :disabled="busy" :aria-pressed="item.done"
                :title="item.done ? 'Mark as not done' : 'Mark as done'" @click="toggleItem(mIndex, gIndex, iIndex)">
                <v-icon size="16">{{ item.done ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
              </button>
              <span v-else class="lp__box lp__box--static" aria-hidden="true">
                <v-icon size="16">{{ item.done ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}</v-icon>
              </span>

              <span class="lp__item-text">{{ item.text }}</span>

              <span v-if="isAdmin" class="lp__item-tools">
                <v-btn class="lp__tool" variant="text" density="compact" size="small" icon="mdi-pencil-outline"
                  :disabled="busy" title="Edit this item" aria-label="Edit this item"
                  @click="openItem(mIndex, gIndex, iIndex)"></v-btn>
                <v-btn class="lp__tool" variant="text" density="compact" size="small" icon="mdi-trash-can-outline"
                  :disabled="busy" title="Delete this item" aria-label="Delete this item"
                  @click="removeItem(mIndex, gIndex, iIndex)"></v-btn>
              </span>
            </li>
          </ul>

          <p v-if="isAdmin && !group.items.length" class="owner-hint owner-hint--tight">
            Nothing in this group yet.
          </p>
        </div>

        <div v-if="isAdmin" class="lp__mission-foot">
          <v-btn variant="text" size="small" prepend-icon="mdi-plus" class="text-capitalize" :disabled="busy"
            title="Add a group to this mission" @click="openGroup(mIndex, null)">Add group</v-btn>
        </div>
      </section>
    </template>

    <!-- Dialogs are mounted only for the owner, so a visitor never loads a form at all. -->
    <template v-if="isAdmin">
      <EditorDialog v-model="detailsOpen" title="List details">
        <v-form v-model="validForm" :disabled="saving">
          <v-text-field v-model="detailsDraft.title" :rules="requiredRule('Title')" label="Title" variant="outlined"
            hide-details="auto" class="mb-4"></v-text-field>
          <v-text-field v-model="detailsDraft.emoji" :rules="emojiRules()" label="Emoji" placeholder="🎯"
            variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
          <v-textarea v-model="detailsDraft.intro" :rules="longTextRules({ fieldName: 'Intro', maxLength: 300 })"
            label="One line about it" variant="outlined" hide-details="auto"
            rows="2" auto-grow class="mb-4"></v-textarea>
          <v-textarea v-model="detailsDraft.northStar" :rules="longTextRules({ fieldName: 'North star', maxLength: 300 })"
            label="North star" variant="outlined" hide-details="auto"
            rows="3" auto-grow hint="The thing every mission below is in service of." persistent-hint
            class="mb-4"></v-textarea>
          <v-switch v-model="detailsDraft.show" color="primary" inset hide-details density="compact"
            label="Show this list publicly"></v-switch>
        </v-form>
        <template #actions>
          <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="detailsOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
            class="text-capitalize" @click="saveDetails">Save</v-btn>
        </template>
      </EditorDialog>

      <EditorDialog v-model="missionOpen" :title="missionIndex === null ? 'Add mission' : 'Edit mission'">
        <v-form v-model="validForm" :disabled="saving">
          <v-text-field v-model="missionDraft.title" :rules="requiredRule('Title')" label="Title" variant="outlined"
            hide-details="auto" class="mb-4"></v-text-field>
          <v-text-field v-model="missionDraft.emoji" :rules="emojiRules()" label="Emoji" placeholder="🐧"
            variant="outlined" hide-details="auto" class="mb-4"></v-text-field>
          <v-select v-model="missionDraft.status" :items="STATUS_OPTIONS" item-title="label" item-value="value"
            :rules="selectRules({ fieldName: 'Status' })"
            label="Status" variant="outlined" hide-details="auto" class="mb-4"></v-select>
        </v-form>
        <template #actions>
          <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="missionOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
            class="text-capitalize" @click="saveMission">Save</v-btn>
        </template>
      </EditorDialog>

      <EditorDialog v-model="groupOpen" :title="groupIndex === null ? 'Add group' : 'Edit group'">
        <v-form v-model="validForm" :disabled="saving">
          <v-text-field v-model="groupDraft.title" :rules="nameRules({ fieldName: 'Group title', maxLength: 80, required: true })"
            label="Group title" variant="outlined" hide-details="auto"
            hint="A phase or a category, e.g. “Phase 1 — Fundamentals”. Leave empty for a bare list."
            persistent-hint class="mb-4"></v-text-field>
          <v-textarea v-if="groupIndex === null" v-model="groupDraft.bulk"
            :rules="longTextRules({ fieldName: 'Items', maxLength: 4000 })" label="Items, one per line"
            variant="outlined" hide-details="auto" rows="6" auto-grow
            hint="Paste a whole checklist here; each line becomes an item." persistent-hint
            class="mb-4"></v-textarea>
        </v-form>
        <template #actions>
          <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="groupOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" :disabled="saving" class="text-capitalize"
            @click="saveGroup">Save</v-btn>
        </template>
      </EditorDialog>

      <EditorDialog v-model="itemOpen" :title="itemIndex === null ? 'Add item' : 'Edit item'">
        <v-form v-model="validForm" :disabled="saving">
          <v-textarea v-model="itemDraft.text" :rules="requiredRule('Text')" label="Item" variant="outlined"
            hide-details="auto" rows="2" auto-grow class="mb-4"></v-textarea>
          <v-switch v-model="itemDraft.done" color="primary" inset hide-details density="compact"
            label="Done"></v-switch>
        </v-form>
        <template #actions>
          <v-btn variant="text" :disabled="saving" class="text-capitalize" @click="itemOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="tonal" :loading="saving" :disabled="!validForm || saving"
            class="text-capitalize" @click="saveItem">Save</v-btn>
        </template>
      </EditorDialog>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * One checklist, in public.
 *
 * Missions hold groups, groups hold checkable items. Everything is editable in place while signed
 * in — the same model the posts use — because a plan that needs a dashboard visit to tick a box is
 * a plan that stops being updated.
 *
 * Every write sends the whole document. The alternative is a patch API per level (mission, group,
 * item, reorder, toggle), which is five endpoints and five ways for the client and server to
 * disagree about shape. A list is a few kilobytes; the round trip is not the bottleneck.
 */
import { computed, defineComponent, onMounted, ref, watch } from 'vue';
import FeedbackNote from '../components/admin/FeedbackNote.vue';
import { RouterLink, useRoute } from 'vue-router';
import { apiFetch, apiJson } from '../utils/api';
import { useAPILoading } from '../store';
import type { ListDoc, ListGroup, ListMission, MissionStatus } from '../types';
import LoadingComponent from '../components/LoadingComponent.vue';
import InlineActions from '../components/admin/InlineActions.vue';
import EditorDialog from '../components/admin/EditorDialog.vue';
import { useAdmin } from '../composables/useAdmin';
import { useFormFeedback } from '../composables/useFormFeedback';
import { deepClone, emojiRules, longTextRules, nameRules, selectRules } from '../utils';

const STATUS_LABELS: Record<MissionStatus, string> = {
  'not-started': 'NOT STARTED',
  'in-progress': 'IN PROGRESS',
  active: 'ACTIVE',
  done: 'DONE',
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as MissionStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const emptyMission = (): ListMission => ({ title: '', emoji: '', status: 'not-started', groups: [] });

export default defineComponent({
  name: 'ListDetail',
  components: { FeedbackNote, RouterLink, LoadingComponent, InlineActions, EditorDialog },
  setup() {
    const route = useRoute();
    const apiLoading = useAPILoading();
    const { isAdmin } = useAdmin();
    const { responseType, responseMessage, success, error, clear } = useFormFeedback();

    const doc = ref<ListDoc | null>(null);
    const notFound = ref(false);
    const busy = ref(false);
    const saving = ref(false);
    const validForm = ref(false);

    const detailsOpen = ref(false);
    const missionOpen = ref(false);
    const groupOpen = ref(false);
    const itemOpen = ref(false);
    const anyDialogOpen = computed(() => detailsOpen.value || missionOpen.value || groupOpen.value || itemOpen.value);

    const detailsDraft = ref({ title: '', emoji: '', intro: '', northStar: '', show: true });
    const missionDraft = ref<ListMission>(emptyMission());
    const missionIndex = ref<number | null>(null);
    const groupDraft = ref({ title: '', bulk: '' });
    const groupIndex = ref<number | null>(null);
    const itemDraft = ref({ text: '', done: false });
    const itemIndex = ref<number | null>(null);
    // Which mission/group the open group or item dialog belongs to.
    const targetMission = ref(0);
    const targetGroup = ref(0);

    const requiredRule = (field: string) => [(v: string) => Boolean((v || '').trim()) || `${field} is required`];

    const missionTotal = (m: ListMission) => m.groups.reduce((n, g) => n + g.items.length, 0);
    const missionDone = (m: ListMission) => m.groups.reduce((n, g) => n + g.items.filter((i) => i.done).length, 0);
    const missionPercent = (m: ListMission) => {
      const total = missionTotal(m);
      return total ? Math.round((missionDone(m) / total) * 100) : 0;
    };

    const totals = computed(() => {
      const missions = doc.value?.missions || [];
      const total = missions.reduce((n, m) => n + missionTotal(m), 0);
      const done = missions.reduce((n, m) => n + missionDone(m), 0);
      return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
    });

    const load = async () => {
      notFound.value = false;
      try {
        apiLoading.setLoading(true);
        const res = await apiFetch(`/lists/${route.params.slug}`);
        if (res.status === 404) {
          notFound.value = true;
          doc.value = null;
          return;
        }
        const json = await res.json();
        // Older documents may predate a field; normalise once here rather than guarding every use.
        const data = (json.data || {}) as Partial<ListDoc>;
        doc.value = {
          title: '',
          emoji: '',
          intro: '',
          northStar: '',
          show: true,
          ...data,
          // Assigned after the spread on purpose: it replaces the raw missions with normalised
          // ones, so every group and item below has the fields the template reads.
          missions: (data.missions || []).map((m) => ({
            ...emptyMission(),
            ...m,
            groups: (m.groups || []).map((g) => ({ ...g, title: g.title || '', items: g.items || [] })),
          })),
        } as ListDoc;
      } catch {
        notFound.value = true;
      } finally {
        apiLoading.setLoading(false);
      }
    };

    onMounted(load);
    watch(() => route.params.slug, load);

    /**
     * Persist the current document.
     *
     * Optimistic: the caller has already mutated `doc`, so the page is up to date before the round
     * trip. On failure the previous document is put back, because a checkbox that silently did not
     * save is worse than one that visibly bounced.
     */
    const commit = async (previous: ListDoc, message?: string) => {
      if (!doc.value) return;
      busy.value = true;
      try {
        await apiJson(`/lists/${doc.value.slug}`, { method: 'PUT', body: JSON.stringify(doc.value) });
        if (message) success(message);
      } catch (e: unknown) {
        doc.value = previous;
        error(e instanceof Error ? e.message : 'Failed to save.');
      } finally {
        busy.value = false;
      }
    };

    /** Snapshot before mutating, so `commit` has something to roll back to. */
    const snapshot = (): ListDoc => deepClone(doc.value as ListDoc);

    const openDetails = () => {
      if (!doc.value) return;
      clear();
      detailsDraft.value = {
        title: doc.value.title, emoji: doc.value.emoji || '', intro: doc.value.intro || '',
        northStar: doc.value.northStar || '', show: doc.value.show !== false,
      };
      detailsOpen.value = true;
    };

    const saveDetails = async () => {
      if (!doc.value) return;
      saving.value = true;
      const before = snapshot();
      Object.assign(doc.value, detailsDraft.value);
      detailsOpen.value = false;
      await commit(before, 'List updated.');
      saving.value = false;
    };

    const openMission = (index: number | null) => {
      clear();
      missionIndex.value = index;
      missionDraft.value = index === null
        ? emptyMission()
        : deepClone(doc.value!.missions[index]);
      missionOpen.value = true;
    };

    const saveMission = async () => {
      if (!doc.value) return;
      saving.value = true;
      const before = snapshot();
      if (missionIndex.value === null) {
        doc.value.missions.push({ ...missionDraft.value, groups: [] });
      } else {
        const existing = doc.value.missions[missionIndex.value];
        // Groups are edited through their own dialogs; the mission form must not drop them.
        doc.value.missions[missionIndex.value] = { ...missionDraft.value, groups: existing.groups };
      }
      missionOpen.value = false;
      await commit(before, 'Mission saved.');
      saving.value = false;
    };

    const removeMission = async (index: number) => {
      if (!doc.value) return;
      const before = snapshot();
      doc.value.missions.splice(index, 1);
      await commit(before, 'Mission removed.');
    };

    const moveMission = async (index: number, delta: number) => {
      if (!doc.value) return;
      const target = index + delta;
      if (target < 0 || target >= doc.value.missions.length) return;
      const before = snapshot();
      const missions = doc.value.missions;
      [missions[index], missions[target]] = [missions[target], missions[index]];
      await commit(before);
    };

    const openGroup = (mIndex: number, gIndex: number | null) => {
      clear();
      targetMission.value = mIndex;
      groupIndex.value = gIndex;
      groupDraft.value = gIndex === null
        ? { title: '', bulk: '' }
        : { title: doc.value!.missions[mIndex].groups[gIndex].title, bulk: '' };
      groupOpen.value = true;
    };

    const saveGroup = async () => {
      if (!doc.value) return;
      saving.value = true;
      const before = snapshot();
      const mission = doc.value.missions[targetMission.value];
      if (groupIndex.value === null) {
        // A pasted checklist becomes one item per non-empty line. A leading bullet and a
        // "[ ]" / "[x]" marker are stripped, and a ticked marker carries through as done — so a
        // list can be pasted straight out of a notes app or a markdown file with its state intact.
        const items = groupDraft.value.bulk
          .split('\n')
          .map((line) => {
            const marker = /^\s*(?:[-*]\s*)?\[([ xX]?)\]\s*/.exec(line);
            const text = line.replace(/^\s*(?:[-*]\s*)?(?:\[[ xX]?\]\s*)?/, '').trim();
            return { text, done: marker ? marker[1].toLowerCase() === 'x' : false };
          })
          .filter((item) => item.text);
        const group: ListGroup = { title: groupDraft.value.title.trim(), items };
        mission.groups.push(group);
      } else {
        mission.groups[groupIndex.value].title = groupDraft.value.title.trim();
      }
      groupOpen.value = false;
      await commit(before, 'Group saved.');
      saving.value = false;
    };

    const removeGroup = async (mIndex: number, gIndex: number) => {
      if (!doc.value) return;
      const before = snapshot();
      doc.value.missions[mIndex].groups.splice(gIndex, 1);
      await commit(before, 'Group removed.');
    };

    const openItem = (mIndex: number, gIndex: number, iIndex: number | null) => {
      clear();
      targetMission.value = mIndex;
      targetGroup.value = gIndex;
      itemIndex.value = iIndex;
      itemDraft.value = iIndex === null
        ? { text: '', done: false }
        : { ...doc.value!.missions[mIndex].groups[gIndex].items[iIndex] };
      itemOpen.value = true;
    };

    const saveItem = async () => {
      if (!doc.value) return;
      saving.value = true;
      const before = snapshot();
      const group = doc.value.missions[targetMission.value].groups[targetGroup.value];
      if (itemIndex.value === null) group.items.push({ ...itemDraft.value });
      else group.items[itemIndex.value] = { ...itemDraft.value };
      itemOpen.value = false;
      await commit(before, 'Item saved.');
      saving.value = false;
    };

    const removeItem = async (mIndex: number, gIndex: number, iIndex: number) => {
      if (!doc.value) return;
      const before = snapshot();
      doc.value.missions[mIndex].groups[gIndex].items.splice(iIndex, 1);
      await commit(before, 'Item removed.');
    };

    const toggleItem = async (mIndex: number, gIndex: number, iIndex: number) => {
      if (!doc.value || busy.value) return;
      const before = snapshot();
      const item = doc.value.missions[mIndex].groups[gIndex].items[iIndex];
      item.done = !item.done;
      await commit(before);
    };

    return {
      STATUS_LABELS, STATUS_OPTIONS,
      apiLoading, isAdmin, doc, notFound, busy, saving, validForm, requiredRule,
      totals, missionTotal, missionDone, missionPercent,
      detailsOpen, missionOpen, groupOpen, itemOpen, anyDialogOpen,
      detailsDraft, missionDraft, missionIndex, groupDraft, groupIndex, itemDraft, itemIndex,
      openDetails, saveDetails, openMission, saveMission, removeMission, moveMission,
      openGroup, saveGroup, removeGroup, openItem, saveItem, removeItem, toggleItem,
      responseType, responseMessage,

      emojiRules,

      longTextRules,

      selectRules,

      nameRules,

    };
  },
});
</script>

<style scoped>
/* A real gap: the trailing space inside the span collapses, so the emoji sat against the word. */
.lp__emoji {
  margin-right: 0.4rem;
}

.lp__back {
  display: inline-block;
  margin-bottom: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: rgb(var(--v-theme-gray-color));
  text-decoration: none;
}

.lp__back:hover {
  color: rgb(var(--v-theme-link-hover-color));
}

.lp__head {
  margin-bottom: 2rem;
}

/* Whole-list progress, directly under the heading: the one number the page exists to show. */
.lp__progress {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: rgb(var(--v-theme-gray-color));
}

.lp__progress-count {
  font-weight: 600;
  color: rgb(var(--v-theme-text-color));
  font-variant-numeric: tabular-nums;
}

.lp__progress-bar {
  flex: 1 1 auto;
  min-width: 60px;
  height: 6px;
  border-radius: 999px;
  background: rgb(var(--v-theme-form));
  overflow: hidden;
}

.lp__progress-fill {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link-hover-color));
  transition: width .3s ease;
}

.lp__progress-pct {
  font-variant-numeric: tabular-nums;
}

/* The north star reads as a statement, not as a paragraph of the intro. */
.lp__north {
  margin: 0 0 2.25rem !important;
  padding: 1rem 1.15rem !important;
  border-left: 3px solid rgb(var(--v-theme-link-hover-color));
  background: rgb(var(--v-theme-form));
  border-radius: 0 6px 6px 0;
  font-size: 1.02rem;
  line-height: 1.7;
  color: rgb(var(--v-theme-text-color));
  white-space: pre-line;
}

.lp__mission {
  margin-bottom: 2.5rem;
}

.lp__mission-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.lp__mission-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-text-color));
  margin: 0 !important;
  min-width: 0;
}

/* Status is a label, not a colour alone: a badge that only differed by hue would say nothing to
   anyone who cannot separate the two. */
.lp__status {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  padding: 3px 7px;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: rgb(var(--v-theme-gray-color));
  white-space: nowrap;
}

.lp__status--active,
.lp__status--in-progress {
  color: rgb(var(--v-theme-link-hover-color));
}

.lp__status--done {
  color: rgb(var(--v-theme-gray-color));
  opacity: 0.8;
}

.lp__mission-count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: rgb(var(--v-theme-gray-color));
  font-variant-numeric: tabular-nums;
}

.lp__mission-bar {
  height: 3px;
  margin: 0.7rem 0 1.1rem;
  border-radius: 999px;
  background: rgb(var(--v-theme-form));
  overflow: hidden;
}

.lp__mission-fill {
  display: block;
  height: 100%;
  background: rgb(var(--v-theme-link-hover-color));
  transition: width .3s ease;
}

.lp__group {
  margin-bottom: 1.25rem;
}

.lp__group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.lp__group-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-gray-color));
  margin: 0 0 0.5rem !important;
}

.lp__items {
  list-style: none;
  margin: 0;
  padding-left: 0 !important;
}

.lp__item {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.28rem 0;
  line-height: 1.6;
}

.lp__item--done .lp__item-text {
  color: rgb(var(--v-theme-gray-color));
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.lp__box {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* The tick is small, but the owner taps it a lot, so the hit area is not. */
  min-width: 28px;
  min-height: 28px;
  margin-top: -2px;
  border-radius: 6px;
  color: rgb(var(--v-theme-gray-color));
}

.lp__item--done .lp__box {
  color: rgb(var(--v-theme-link-hover-color));
}

.lp__box:not(.lp__box--static):hover {
  background: rgba(var(--v-theme-text-color), 0.07);
}

.lp__box--static {
  cursor: default;
}

.lp__item-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Owner controls. Hidden until the row is hovered on a pointer device so the list still reads as
   a list; always visible on touch, where there is no hover to reveal them with. */
.lp__item-tools {
  margin-left: auto;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity .12s ease;
}

.lp__item:hover .lp__item-tools,
.lp__item:focus-within .lp__item-tools {
  opacity: 1;
}

@media (hover: none) {
  .lp__item-tools {
    opacity: 1;
  }
}

.lp__tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: wrap;
}

.lp__tool {
  color: rgb(var(--v-theme-gray-color)) !important;
}

.lp__tool:hover {
  color: rgb(var(--v-theme-text-color)) !important;
}

.lp__mission-foot {
  margin-top: 0.25rem;
}

.owner-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
}

.owner-bar__alert {
  flex: 1 1 220px;
  min-width: 0;
}

.owner-hint {
  color: rgb(var(--v-theme-gray-color));
  font-size: 0.9rem;
  margin-bottom: 1rem !important;
}

.owner-hint--tight {
  margin-bottom: 0.5rem !important;
}
</style>
