<template>
  <!-- Alert for displaying API response messages -->
  <v-alert v-if="responseMessage" :type="responseType" class="mb-4" variant="tonal" dismissible
    @update:model-value="clearResponseMessage">
    {{ responseMessage }}
  </v-alert>

  <!-- Form for user settings -->
  <v-form v-model="validForm" :disabled="apiLoading.isLoading()" @submit.prevent="saveUserSettings">
    <div v-for="(input, index) in inputs" :key="index">
      <template v-if="input.type === 'text' || input.type === 'email'">
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
    </div>

    <!-- Save button -->
    <v-btn :disabled="apiLoading.isLoading() || !validForm" :loading="apiLoading.isLoading()" title="Save Settings"
      class="mb-4" color="primary" variant="tonal" type="submit">
      Save Settings
    </v-btn>
  </v-form>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useAPILoading } from '../../store';
import { nameRules, emailRules } from '../../utils';

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
}

// Initialize reactive state
const validForm = ref(false);
const apiLoading = useAPILoading();
const responseType = ref<'success' | 'error'>('success');
const responseMessage = ref<string | null>(null);

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
    rules: [],
    type: 'input',
    label: 'Upload Resume',
    description: 'Upload your resume',
    icon: 'mdi-upload',
  },
]);

// Map input values to user settings object
const userSettings = computed<UserSettings>(() => ({
  name: inputs.value.find((input) => input.label === 'Full Name')?.value || '',
  email: inputs.value.find((input) => input.label === 'Email Address')?.value || '',
}));

// Fetch initial user settings (if applicable)
const fetchUserSettings = async () => {
  // try {
  //     apiLoading.setLoading(true);
  //     const response = await fetch('/api/user/settings', {
  //         method: 'GET',
  //         headers: {
  //             'Content-Type': 'application/json',
  //         },
  //     });

  //     if (!response.ok) throw new Error('Failed to fetch user settings');

  //     const data = await response.json();
  //     inputs.value.forEach((input) => {
  //         if (data[input.label.toLowerCase().replace(/\s+/g, '')]) {
  //             input.value = data[input.label.toLowerCase().replace(/\s+/g, '')];
  //         }
  //     });
  // } catch (error) {
  //     handleError(error, 'Failed to load user settings');
  // } finally {
  //     apiLoading.setLoading(false);
  // }
};

// Save user settings to the API
const saveUserSettings = async () => {
  try {
    apiLoading.setLoading(true);
    const response = await fetch('/api/user/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userSettings.value),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to save settings');

    responseType.value = 'success';
    responseMessage.value = data.message || 'Settings saved successfully';
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

// Load initial user settings on component mount
onMounted(() => {
  fetchUserSettings();
});
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