<template>
  <!-- Alert for displaying API response messages -->
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal" dismissible
    @update:model-value="clearResponseMessage">
    {{ responseMessage }}
  </v-alert>

  <!-- Form for user settings -->
  <v-form v-model="validForm" :disabled="apiLoading.isLoading()" @submit.prevent="saveUserSettings">
    <div v-for="(input, index) in inputs" :key="index">
      <template v-if="input.type === 'text' || input.type === 'email' || input.type === 'url'">
        <v-text-field v-model="input.value" :rules="input.rules" :type="input.type" :label="input.label"
          :title="input.title" variant="outlined" hide-details="auto" :aria-label="input.label"
          :aria-describedby="`${input.label}-description`" :append-icon="input.icon">
          <!-- Optional description for accessibility -->
          <template #details>
            <span :id="`${input.label}-description`" class="sr-only">
              {{ input.description || `Enter your ${input.label.toLowerCase()}` }}
            </span>
          </template>
        </v-text-field>
      </template>

      <template v-else-if="input.type === 'input'">
        <v-file-input :label="input.label" :title="input.title" variant="outlined" hide-details="auto"
          :rules="input.rules" show-size :append-icon="input.icon" prepend-icon=""></v-file-input>
      </template>

      <template v-else-if="input.type === 'select'">
        <v-autocomplete :rules="input.rules" v-model="input.value" :title="input.title" class="mb-4"
          :label="input.label" variant="outlined" :append-icon="input.icon" hide-details="auto" :hint="input.hint"
          :items="input.items" item-value="code" item-title="title">
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
import { ref, computed, onMounted, defineEmits, defineProps, watch } from 'vue';

// Define props and emits
const props = defineProps({
  setupMode: {
    type: Boolean,
    default: false
  },
  introMode: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['settings-saved', 'form-data-changed']);
import { useAPILoading } from '../../store';
import { nameRules, emailRules, isValidURL, requiredRule } from '../../utils';

// Define interfaces for better type safety
interface UserSettings {
  name: string;
  email: string;
}

interface InputField {
  title: string;
  value: string;
  rules: ((value: string) => true | string)[];
  type: string;
  label: string;
  description?: string;
  icon?: string;
  hint?: string;
  items?: { title: string; code: string }[];
}

// Initialize reactive state
const validForm = ref(false);
const apiLoading = useAPILoading();
const responseType = ref<'success' | 'error'>('success');
const responseMessage = ref<string | null>(null);
const countries = ref<{ title: string, code: string }[]>([]);

// Load initial user settings on component mount
// Fetch countries
onMounted(() => {
  fetchUserSettings();
  getCountries();
  // Watch for changes in the form data and emit to parent
  watch(inputs, () => {
    const formData = {
      fullName: inputs.value.find((input) => input.label === 'Full Name')?.value || '',
      email: inputs.value.find((input) => input.label === 'Email Address')?.value || '',
      resumeUrl: inputs.value.find((input) => input.label === 'Resume URL')?.value || '',
      country: inputs.value.find((input) => input.label === 'Country')?.value || '',
    };

    console.log("formData", formData);

    emit('form-data-changed', formData);
  }, { deep: true });
});

// Define input fields with proper validation rules
const inputs = ref<InputField[]>([
  {
    title: 'Full Name',
    value: '',
    rules: nameRules({
      fieldName: 'Full Name',
      maxLength: 60,
      minLength: 10,
    }),
    type: 'text',
    label: 'Full Name',
    description: 'Your full name, between 10 and 60 characters',
    icon: 'mdi-account',
  },
  {
    title: 'Email Address',
    value: '',
    rules: emailRules({
      fieldName: 'Email Address',
      maxLength: 100,
      minLength: 10,
    }),
    type: 'email',
    label: 'Email Address',
    description: 'Your email address, used for communication',
    icon: 'mdi-email',
  },
  {
    title: 'Resume',
    value: '',
    rules: isValidURL(),
    type: 'url',
    label: 'Resume URL',
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
]);

// Fetch countries
function getCountries(lang = 'en') {
  const A = 65
  const Z = 90
  const countryName = new Intl.DisplayNames([lang], { type: 'region' });
  for (let i = A; i <= Z; ++i) {
    for (let j = A; j <= Z; ++j) {
      let code = String.fromCharCode(i) + String.fromCharCode(j)
      let name = countryName.of(code)
      if (code !== name) {
        countries.value.push({ title: name as string, code: code })
      }
    }
  }
  return countries
}

// Map input values to user settings object
const userSettings = computed<UserSettings>(() => ({
  name: inputs.value.find((input) => input.label === 'Full Name')?.value || '',
  email: inputs.value.find((input) => input.label === 'Email Address')?.value || '',
}));

// Fetch initial user settings (if applicable)
const fetchUserSettings = async () => {
  try {
    apiLoading.setLoading(true);

    // Import settings store dynamically to avoid circular dependencies
    const { useSiteSettingsStore } = await import('../../store');
    const settingsStore = useSiteSettingsStore();

    if (!settingsStore.isSettingsLoaded()) {
      await settingsStore.loadSettings();
    }

    const settings = settingsStore.getSettings;

    // Always update input values, even with default settings
    const fullNameInput = inputs.value.find(input => input.label === 'Full Name');
    if (fullNameInput) fullNameInput.value = settings.personal?.fullName || '';

    const emailInput = inputs.value.find(input => input.label === 'Email Address');
    if (emailInput) emailInput.value = settings.personal?.email || '';

    const resumeInput = inputs.value.find(input => input.label === 'Resume URL');
    if (resumeInput) resumeInput.value = settings.personal?.resumeURL || '';

    const countryInput = inputs.value.find(input => input.label === 'Country');
    if (countryInput) countryInput.value = settings.personal?.country || '';

    // Emit form data to parent
    const formData = {
      fullName: fullNameInput?.value || '',
      email: emailInput?.value || '',
      resumeUrl: resumeInput?.value || '',
      country: countryInput?.value || ''
    };

    emit('form-data-changed', formData);
  } catch (error) {
    console.warn('Using default settings:', error);
    // Don't show error to user, just use defaults
  } finally {
    apiLoading.setLoading(false);
  }
};

// Save user settings to the API
const saveUserSettings = async () => {
  try {
    apiLoading.setLoading(true);

    // Import settings store dynamically to avoid circular dependencies
    const { useSiteSettingsStore } = await import('../../store');
    const settingsStore = useSiteSettingsStore();

    if (!settingsStore.isSettingsLoaded()) {
      await settingsStore.loadSettings();
    }

    const currentSettings = settingsStore.getSettings || {} as any;

    // Create updated settings object
    const updatedSettings = {
      ...currentSettings,
      personal: {
        ...(currentSettings.personal || {}),
        fullName: inputs.value.find(input => input.label === 'Full Name')?.value || '',
        email: inputs.value.find(input => input.label === 'Email Address')?.value || '',
        resumeURL: inputs.value.find(input => input.label === 'Resume URL')?.value || '',
        country: inputs.value.find(input => input.label === 'Country')?.value || '',
      }
    };

    await settingsStore.updateSettings(updatedSettings);

    responseType.value = 'success';
    responseMessage.value = 'Settings saved successfully';

    // Emit event to notify parent component that settings were saved
    emit('settings-saved');
  } catch (error) {
    handleError(error, 'Failed to save settings');
  } finally {
    apiLoading.setLoading(false);
  }
};

// Handle errors and display them in the alert
const handleError = (error: unknown, defaultMessage: string) => {
  responseType.value = 'error';
  responseMessage.value =
    error instanceof Error ? error.message : defaultMessage;
};

// Clear response message when alert is dismissed
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