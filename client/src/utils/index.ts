
const validateAdminSignature = (savedSignature: string, signature: string) => {
  return savedSignature === signature;
}

const nameRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => v && v.length > 0 || `${options.fieldName} is required`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];

const githubWebsiteRules = () => [
  (v: string) => v && v.length > 0 || 'GitHub profile URL is required',
  (v: string) => v && v.includes('github.com') || 'Please enter a valid GitHub profile URL',
];

const requiredRule = () => [
  (v: string) => v && v.length > 0 || 'This field is required'
];

const longTextRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => v && v.length > 0 || `${options.fieldName} is required`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];

const emailRules = (options: {
  fieldName: string,
  minLength: number,
  maxLength: number
}) => [
    (v: string) => typeof v === 'string' || `${options.fieldName} must be a string.`,
    (v: string) => !!v || `${options.fieldName} is required.`,
    (v: string) => /.+@.+\..+/.test(v) || `${options.fieldName} is not valid.`,
    (v: string) => v && v.length >= options.minLength || `${options.fieldName} must be at least ${options.minLength} characters`,
    (v: string) => v && v.length <= options.maxLength || `${options.fieldName} must be at most ${options.maxLength} characters`
  ];


const isValidURL = () => [
  (v: string) => v && /^(https?:\/\/)?([\w\d-]+\.)+[a-z]{2,6}(:[0-9]+)?(\/.*)?$/.test(v) || 'Please enter a valid URL'
];

const antiBotRules = () => [
  (v: string) => (
    v && v.toLowerCase() === 'mahmoud-emad' ||
    v && v.toLowerCase() === 'omdanii' ||
    v && v.toLowerCase() === '@omdanii' ||
    v && v.toLowerCase() === '@mahmoud-emad'
  ) || 'Please enter the correct anti-bot value, which is "Mahmoud-Emad" or "Omdanii"',
];

const validateProjectTagsRules = (tags: string[]) => [
  // if tags, then it should be at 4 or less
  (v: string[]) => v && tags.length <= 4 || 'You can add up to 4 tags',
];

const formatData = (data: string) => {
  return new Date(data).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export {
  validateProjectTagsRules,
  validateAdminSignature,
  githubWebsiteRules,
  nameRules,
  longTextRules,
  isValidURL,
  requiredRule,
  antiBotRules,
  formatData,
  emailRules,
}
