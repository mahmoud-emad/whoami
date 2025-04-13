<template>
  <!-- Alert for displaying API response messages -->
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal" dismissible
    @update:model-value="clearResponseMessage">
    {{ responseMessage }}
  </v-alert>

  <v-alert :type="'info'" class="mb-4" variant="tonal" dismissible>
    In case you are using a custom avatar, It's recommended to use avatar in Ghibli's style
  </v-alert>

  <!-- Form for user settings -->
  <v-form v-model="validForm" :disabled="apiLoading.isLoading()" @submit.prevent="saveUserSettings">
    <div v-for="(input, index) in inputs" :key="index">
      <template v-if="input.type === 'text' || input.type === 'email' || input.type === 'url'">
        <v-text-field base-color="primary" color="primary" item-color="primary"
          bg-color="rgb(var(--v-theme-box-bg-color))" v-model="input.value" :rules="input.rules" :type="input.type"
          :label="input.label" :title="input.title" variant="outlined" hide-details="auto" :aria-label="input.label"
          :aria-describedby="`${input.label}-description`">
          <!-- Optional description for accessibility -->
          <template #append>
            <v-icon color="primary">{{ input.icon }}</v-icon>
          </template>
          <template #details>
            <span :id="`${input.label}-description`" class="sr-only">
              {{ input.description || `Enter your ${input.label.toLowerCase()}` }}
            </span>
          </template>
        </v-text-field>
      </template>

      <template v-else-if="input.type === 'input'">
        <v-file-input base-color="primary" color="primary" item-color="primary"
          bg-color="rgb(var(--v-theme-box-bg-color))" :label="input.label" :title="input.title" variant="outlined"
          hide-details="auto" :rules="input.rules" show-size prepend-icon="" class="mb-4">
          <template #append>
            <v-icon color="primary">{{ input.icon }}</v-icon>
          </template>
        </v-file-input>
      </template>

      <template v-else-if="input.type === 'select'">
        <v-autocomplete base-color="primary" color="primary" item-color="primary"
          bg-color="rgb(var(--v-theme-box-bg-color))" :rules="input.rules" v-model="input.value" :title="input.title"
          class="mb-4" :label="input.label" variant="outlined" hide-details="auto" :hint="input.hint"
          :items="input.items" item-value="code" item-title="title">
          <template #append>
            <v-icon color="primary">{{ input.icon }}</v-icon>
          </template>
        </v-autocomplete>
      </template>
    </div>

    <!-- Save button -->
    <!-- Save button - hidden in setup mode -->
    <v-btn v-if="!props.setupMode" :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()"
      title="Save Settings" class="mb-4" color="primary" variant="tonal" type="submit">
      Save Settings
    </v-btn>
  </v-form>
</template>

<script lang="ts" setup>
import { ref, onMounted, defineEmits, watch } from 'vue';

const props = defineProps({
  setupMode: { type: Boolean, default: false },
  introMode: { type: Boolean, default: false },
});

const emit = defineEmits(['settings-saved', 'form-data-changed']);
import { useAPILoading } from '../../store';
import { nameRules, emailRules, requiredRule, validateFileRules } from '../../utils';
import { SettingsType } from '../../types';

interface InputField {
  title: string;
  value: string | File | null;
  rules: ((value: any) => true | string)[];
  type: string;
  label: string;
  description?: string;
  icon?: string;
  hint?: string;
  items?: { title: string; code: string }[];
}

const validForm = ref(false);
const apiLoading = useAPILoading();
const responseType = ref<'success' | 'error'>('success');
const responseMessage = ref<string | null>(null);
const countries = ref<{ title: string, code: string }[]>([]);

onMounted(() => {
  fetchUserSettings();
  getCountries();
});

const inputs = ref<InputField[]>([
  {
    title: 'Full Name',
    value: '',
    rules: nameRules({ fieldName: 'Full Name', maxLength: 60, minLength: 10 }),
    type: 'text',
    label: 'Full Name',
    description: 'Your full name, between 10 and 60 characters',
    icon: 'mdi-account',
  },
  {
    title: 'Email Address',
    value: '',
    rules: emailRules({ fieldName: 'Email Address', maxLength: 100, minLength: 10 }),
    type: 'email',
    label: 'Email Address',
    description: 'Your email address, used for communication',
    icon: 'mdi-email',
  },
  {
    title: 'Resume',
    value: null,
    rules: [...validateFileRules({
      fieldName: 'Resume',
      allowedExtensions: ['pdf', 'doc', 'docx'],
      fieldSize: 5,
    })],
    type: 'input',
    label: 'Resume',
    description: 'Upload your resume',
    icon: 'mdi-link',
  },
  {
    title: 'Country',
    value: '',
    rules: [...requiredRule()],
    type: 'select',
    items: countries.value,
    label: 'Country',
    description: 'Your country of residence',
    icon: 'mdi-earth',
  },
  {
    title: 'Avatar',
    value: null,
    rules: [...validateFileRules({
      fieldName: 'Avatar',
      allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'],
      fieldSize: 2,
    })],
    type: 'input',
    label: 'Avatar',
    description: "It's recommended to use avatar in Ghibli's style",
    icon: 'mdi-image',
  },
]);

watch(inputs, () => {
  const formData = {
    fullName: inputs.value.find((input) => input.label === 'Full Name')?.value || '',
    email: inputs.value.find((input) => input.label === 'Email Address')?.value || '',
    resumeUrl: inputs.value.find((input) => input.label === 'Resume')?.value
      ? (inputs.value.find((input) => input.label === 'Resume')?.value as File)?.name || ''
      : '',
    country: inputs.value.find((input) => input.label === 'Country')?.value || '',
    avatarUrl: inputs.value.find((input) => input.label === 'Avatar')?.value
      ? (inputs.value.find((input) => input.label === 'Avatar')?.value as File)?.name || ''
      : '',
  };

  console.log('formData', formData);
  emit('form-data-changed', formData);
}, { deep: true });

function getCountries(lang = 'en') {
  const A = 65;
  const Z = 90;
  const countryName = new Intl.DisplayNames([lang], { type: 'region' });
  for (let i = A; i <= Z; ++i) {
    for (let j = A; j <= Z; ++j) {
      let code = String.fromCharCode(i) + String.fromCharCode(j);
      let name = countryName.of(code);
      if (code !== name) {
        countries.value.push({ title: name as string, code });
      }
    }
  }
  return countries;
}

const fetchUserSettings = async () => {
  try {
    apiLoading.setLoading(true);
    const { useSiteSettingsStore } = await import('../../store');
    const settingsStore = useSiteSettingsStore();
    const settings = settingsStore.settings;

    const fullNameInput = inputs.value.find((input) => input.label === 'Full Name');
    if (fullNameInput) fullNameInput.value = settings.personal?.fullName || '';

    const emailInput = inputs.value.find((input) => input.label === 'Email Address');
    if (emailInput) emailInput.value = settings.personal?.email || '';

    const resumeInput = inputs.value.find((input) => input.label === 'Resume');
    if (resumeInput) resumeInput.value = settings.personal?.resumeURL || null;

    const countryInput = inputs.value.find((input) => input.label === 'Country');
    if (countryInput) countryInput.value = settings.personal?.country || '';

    const avatarInput = inputs.value.find((input) => input.label === 'Avatar');
    if (avatarInput) avatarInput.value = settings.personal?.avatarURL || null;

    const formData = {
      fullName: fullNameInput?.value || '',
      email: emailInput?.value || '',
      resumeUrl: resumeInput?.value || '',
      country: countryInput?.value || '',
      avatarUrl: avatarInput?.value || '',
    };

    emit('form-data-changed', formData);
  } catch (error) {
    console.warn('Using default settings:', error);
  } finally {
    apiLoading.setLoading(false);
  }
};

const saveUserSettings = async () => {
  try {
    apiLoading.setLoading(true);
    const { useSiteSettingsStore } = await import('../../store');
    const settingsStore = useSiteSettingsStore();

    let resumeUrl = inputs.value.find((input) => input.label === 'Resume')?.value;
    let avatarUrl = inputs.value.find((input) => input.label === 'Avatar')?.value;

    if (resumeUrl instanceof File) {
      const formData = new FormData();
      formData.append('file', resumeUrl);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      resumeUrl = result.url;
    }

    if (avatarUrl instanceof File) {
      const formData = new FormData();
      formData.append('file', avatarUrl);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      avatarUrl = result.url;
    }

    const currentSettings = settingsStore.settings || {} as SettingsType;

    const updatedSettings = {
      ...currentSettings,
      personal: {
        ...(currentSettings.personal || {}),
        fullName: inputs.value.find((input) => input.label === 'Full Name')?.value || '',
        email: inputs.value.find((input) => input.label === 'Email Address')?.value || '',
        resumeURL: resumeUrl || '',
        country: inputs.value.find((input) => input.label === 'Country')?.value || '',
        avatarURL: avatarUrl || '',
      },
    };

    await settingsStore.updateSettings(updatedSettings as SettingsType);

    responseType.value = 'success';
    responseMessage.value = 'Settings saved successfully';
    emit('settings-saved');
  } catch (error) {
    handleError(error, 'Failed to save settings');
  } finally {
    apiLoading.setLoading(false);
  }
};

const handleError = (error: unknown, defaultMessage: string) => {
  responseType.value = 'error';
  responseMessage.value = error instanceof Error ? error.message : defaultMessage;
};

const clearResponseMessage = () => {
  responseMessage.value = null;
};
</script>

<style scoped>
/* Add custom styles if needed */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>