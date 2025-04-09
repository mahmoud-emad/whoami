<template>
    <v-tabs-window class="pa-2 mb-2 mt-2 custom-border tabs-height" v-model="modelValue">
        <v-tabs-window-item v-for="tab in tabs" :key="tab.value" class="mt-2" :value="tab.value">
            <div class="tab-content-scroll">
                <SetupWizardHeader v-if="setupMode" :current-step="currentStep" :tab-label="tab.label"
                    :instructions="tab.setupInstructions || tab.description" class="mb-4" />
                <v-alert v-else class="mb-4 custom-border" type="info" variant="tonal">
                    {{ tab.description }}
                </v-alert>
                <component :is="tab.component" :setup-mode="setupMode" :intro-mode="isIntro"
                    @settings-saved="$emit('settings-saved', tab.value)"
                    @form-data-changed="$emit('form-data-changed', tab.value, $event)" />
                <FieldGuides v-if="setupMode && tab.fieldGuides?.length" :guides="tab.fieldGuides" class="mt-4" />
                <SetupNavigation v-if="setupMode" :current-step="currentStep" :total-steps="totalSteps"
                    @previous="$emit('previous-step')" @next="$emit('next-step')" @complete="$emit('complete-setup')"
                    class="mt-4" />
            </div>
        </v-tabs-window-item>
    </v-tabs-window>
</template>

<script setup lang="ts">
import { TabDefinition } from '../../types';
import SetupWizardHeader from './SetupWizardHeader.vue';
import FieldGuides from './FieldGuides.vue';
import SetupNavigation from './SetupNavigation.vue';

defineProps<{
    tabs: TabDefinition[];
    setupMode: boolean;
    isIntro: boolean;
    currentStep: number;
    totalSteps: number;
}>();

defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'settings-saved', tabValue: string): void;
    (e: 'form-data-changed', tabValue: string, data: any): void;
    (e: 'previous-step'): void;
    (e: 'next-step'): void;
    (e: 'complete-setup'): void;
}>();

const modelValue = defineModel<string>('modelValue', { required: true });
</script>

<style scoped>
.tabs-height {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
}

.v-tabs-window-item {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.tab-content-scroll {
    flex: 1 1 auto;
    overflow-y: auto;
    min-height: 0;
    padding: 16px;
    border-radius: 4px;
}

.custom-border {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 4px;
}

@media (max-width: 768px) {
    .tab-content-scroll {
        padding: 12px;
    }
}
</style>