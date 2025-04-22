<template>
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal" dismissible
    @update:model-value="clearResponseMessage">
    {{ responseMessage }}
  </v-alert>

  <v-alert type="info" class="mb-4" variant="tonal" dismissible>
    In case you are using a custom avatar, It's recommended to use avatar in Ghibli's style
  </v-alert>

  <v-alert v-if="uploadingMessage" type="info" class="mb-4" variant="tonal" dismissible>
    {{ uploadingMessage }}
  </v-alert>

  <v-form v-model="validForm" :disabled="apiLoading.isLoading()" @submit.prevent="saveUserSettings">
    <div v-for="(input, index) in inputs" :key="index">
      <component :is="getComponent(input.type)" v-model="input.value" :loading="apiLoading.isLoading()"
        :rules="input.rules" :label="input.label" :title="input.title" :hint="input.hint" :items="input.items"
        :item-title="input.type === 'select' ? 'title' : undefined"
        :item-value="input.type === 'select' ? 'code' : undefined" base-color="primary" color="primary"
        item-color="primary" bg-color="rgb(var(--v-theme-box-bg-color))" variant="outlined" hide-details="auto"
        class="mb-4" :aria-label="input.label" :aria-describedby="`${input.label}-description`" show-size
        prepend-icon="">
        <template #append>
          <v-icon color="primary">{{ input.icon }}</v-icon>
        </template>
        <template #details>
          <span :id="`${input.label}-description`" class="sr-only">
            {{ input.description || `Enter your ${input.label.toLowerCase()}` }}
          </span>
        </template>
      </component>
    </div>

    <v-btn v-if="!props.setupMode" :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()"
      title="Save Settings" class="mb-4" color="primary" variant="tonal" type="submit">
      Save Settings
    </v-btn>
  </v-form>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, Ref } from 'vue';
import { useAPILoading } from '../../store';
import { nameRules, emailRules, requiredRule, validateFileRules } from '../../utils';
import SettingsAPI from '../../api/settings';
import type { InputField, SettingsType } from '../../types';

const props = defineProps({ setupMode: Boolean });
const emit = defineEmits(['settings-saved', 'form-data-changed', 'is-valid-form']);

const validForm = ref(false);
const apiLoading = useAPILoading();
const responseType = ref<'success' | 'error'>('success');
const responseMessage = ref<string | null>(null);
const uploadingMessage = ref<string | null>(null);
const countries = ref<{ title: string; code: string }[]>([]);
const isUploadedResume = ref(false);
const isUploadedAvatar = ref(false);

onMounted(() => {
  fetchUserSettings();
  generateCountryList();
});

const inputs = ref<InputField[]>([
  { title: 'Full Name', value: '', rules: nameRules({ fieldName: 'Full Name', maxLength: 60, minLength: 10 }), type: 'text', label: 'Full Name', description: 'Your full name, between 10 and 60 characters', icon: 'mdi-account' },
  { title: 'Email Address', value: '', rules: emailRules({ fieldName: 'Email Address', maxLength: 100, minLength: 10 }), type: 'email', label: 'Email Address', description: 'Your email address, used for communication', icon: 'mdi-email' },
  { title: 'Resume', value: null, rules: validateFileRules({ fieldName: 'Resume', allowedExtensions: ['pdf', 'doc', 'docx'], fieldSize: 7 }), type: 'input', label: 'Resume', icon: 'mdi-link', description: 'Please be aware that the resume file will be uploaded to the server once you select it.' },
  { title: 'Country', value: '', rules: requiredRule(), type: 'select', label: 'Country', items: countries.value, icon: 'mdi-earth' },
  { title: 'Avatar', value: null, rules: validateFileRules({ fieldName: 'Avatar', allowedExtensions: ['jpg', 'jpeg', 'png', 'gif'], fieldSize: 2 }), type: 'input', label: 'Avatar', icon: 'mdi-image', description: 'Please be aware that the avatar image will be uploaded to the server once you select it.' }
]);

watch(inputs, async () => {
  const getValue = (label: string) => inputs.value.find(i => i.label === label)?.value;

  const handleUpload = async (label: string, isUploaded: Ref<boolean>, uploadFn: Function, message: string) => {
    const value = getValue(label);
    if (value instanceof File && !isUploaded.value) {
      apiLoading.setLoading(true);
      uploadingMessage.value = message;
      await uploadFn(value);
      apiLoading.setLoading(false);
      uploadingMessage.value = null;
      isUploaded.value = true;
    }
  };

  await handleUpload('Resume', isUploadedResume, SettingsAPI.uploadResume, 'Uploading resume to the server...');
  await handleUpload('Avatar', isUploadedAvatar, SettingsAPI.uploadAvatar, 'Uploading avatar to the server...');

  emit('form-data-changed', {
    fullName: getValue('Full Name') || '',
    email: getValue('Email Address') || '',
    resumeUrl: getValue('Resume')?.name || '',
    country: getValue('Country') || '',
    avatarUrl: getValue('Avatar')?.name || ''
  });

  emit('is-valid-form', validForm.value);
}, { deep: true, immediate: true });

function generateCountryList(lang = 'en') {
  const nameFormatter = new Intl.DisplayNames([lang], { type: 'region' });
  for (let i = 65; i <= 90; ++i) {
    for (let j = 65; j <= 90; ++j) {
      const code = String.fromCharCode(i) + String.fromCharCode(j);
      const name = nameFormatter.of(code);
      if (code !== name) countries.value.push({ title: name!, code });
    }
  }
}

async function fetchUserSettings() {
  try {
    apiLoading.setLoading(true);
    const { useSiteSettingsStore } = await import('../../store');
    const settings = useSiteSettingsStore().settings;

    inputs.value.find(i => i.label === 'Full Name')!.value = settings.personal?.fullName || '';
    inputs.value.find(i => i.label === 'Email Address')!.value = settings.personal?.email || '';
    inputs.value.find(i => i.label === 'Resume')!.value = settings.personal?.resumeURL || null;
    inputs.value.find(i => i.label === 'Country')!.value = settings.personal?.country || '';
    inputs.value.find(i => i.label === 'Avatar')!.value = settings.personal?.avatarURL || null;

    emit('form-data-changed', {
      fullName: settings.personal?.fullName || '',
      email: settings.personal?.email || '',
      resumeUrl: settings.personal?.resumeURL || '',
      country: settings.personal?.country || '',
      avatarUrl: settings.personal?.avatarURL || ''
    });
  } catch (e) {
    console.warn('Using default settings', e);
  } finally {
    apiLoading.setLoading(false);
  }
}

async function saveUserSettings() {
  try {
    apiLoading.setLoading(true);
    const { useSiteSettingsStore } = await import('../../store');
    const settingsStore = useSiteSettingsStore();

    const getValue = (label: string) => inputs.value.find(i => i.label === label)?.value;
    let resumeUrl = getValue('Resume');
    let avatarUrl = getValue('Avatar');

    const upload = async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      return result.url;
    };

    if (resumeUrl instanceof File) resumeUrl = await upload(resumeUrl);
    if (avatarUrl instanceof File) avatarUrl = await upload(avatarUrl);

    const currentSettings = settingsStore.settings || {} as SettingsType;
    const updatedSettings = {
      ...currentSettings,
      personal: {
        ...(currentSettings.personal || {}),
        fullName: getValue('Full Name') || '',
        email: getValue('Email Address') || '',
        resumeURL: resumeUrl || '',
        country: getValue('Country') || '',
        avatarURL: avatarUrl || ''
      }
    };

    await settingsStore.updateSettings(updatedSettings);
    responseType.value = 'success';
    responseMessage.value = 'Settings saved successfully';
    emit('settings-saved');
  } catch (err) {
    handleError(err, 'Failed to save settings');
  } finally {
    apiLoading.setLoading(false);
  }
}

function handleError(error: unknown, fallback: string) {
  responseType.value = 'error';
  responseMessage.value = error instanceof Error ? error.message : fallback;
}

function clearResponseMessage() {
  responseMessage.value = null;
}

function getComponent(type: string) {
  if (type === 'text' || type === 'email' || type === 'url') return 'v-text-field';
  if (type === 'select') return 'v-autocomplete';
  if (type === 'input') return 'v-file-input';
  return 'v-text-field';
}
</script>