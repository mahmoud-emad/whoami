import { TabDefinition } from '../../types';

export const dashboardTabs: Omit<TabDefinition, 'component'>[] = [
    {
        label: "User Settings",
        value: "user-settings",
        icon: "mdi-account",
        componentName: "UserSettingsForm",
        description: "Use this form to configure user settings.",
        setupInstructions: "Start by setting up your personal information. This will be displayed on your portfolio.",
        setupStep: 1,
        required: true,
        enabled: true,
        introMessage: 'Use this form to configure your account settings.',
        fieldGuides: [
            { field: "Full Name", description: "Enter your full name as you want it to appear on your portfolio." },
            { field: "Email Address", description: "Enter a valid email address where visitors can contact you." },
            { field: "Resume URL", description: "Provide a link to your resume or CV if available." },
            { field: "Country", description: "Select your country of residence." }
        ]
    },
    {
        label: "Site Settings",
        value: "settings",
        icon: "mdi-cog",
        componentName: "SettingsForm",
        description: "Use this form to configure site settings.",
        setupInstructions: "Configure your site settings including security options and themes.",
        setupStep: 2,
        required: true,
        enabled: false,
        introMessage: 'Use this form to configure site settings.',
        fieldGuides: [
            { field: "GitHub Link", description: "Enter your GitHub profile URL to showcase your repositories." },
            { field: "Admin Fingerprint", description: "Create a secure password for admin access." },
            { field: "Theme Support", description: "Enable to allow users to switch between light and dark themes." },
            { field: "Admin Dashboard", description: "Enable to make the admin dashboard accessible." }
        ]
    },
    {
        label: "Configure Search Engine",
        value: "search-engine",
        icon: "mdi-database-search",
        componentName: "SearchEngineForm",
        description: "Use this form to configure the search engine.",
        setupInstructions: "Set up your site's search functionality to help visitors find content.",
        setupStep: 3,
        required: true,
        enabled: false,
        introMessage: 'Use this form to configure the search engine.',
        fieldGuides: [
            { field: "Enable Search", description: "Turn on the search functionality for your site." },
            { field: "Search Guestbooks", description: "Include guestbook entries in search results." },
            { field: "Search Projects", description: "Include projects in search results." },
            { field: "Search Articles", description: "Include articles in search results." },
            { field: "Search Posts", description: "Include blog posts in search results." }
        ]
    },
    {
        label: "Create a new project",
        value: "new-project",
        icon: "mdi-package",
        componentName: "ProjectForm",
        description: "Use this form to create a new project.",
        setupInstructions: "Add your first project to showcase your work.",
        setupStep: 4,
        required: true,
        enabled: false,
        introMessage: 'Use this form to create a new project.',
        fieldGuides: [
            { field: "Project Title", description: "Enter a descriptive title for your project." },
            { field: "Project Link", description: "Provide a URL where visitors can view or try your project." },
            { field: "Project Type", description: "Select whether this is a personal project or open source contribution." },
            { field: "Project Tags", description: "Add relevant technologies and skills used in this project." },
            { field: "Project Description", description: "Write a detailed description explaining what the project does and your role in it." }
        ]
    },
    {
        label: "Create a new article",
        value: "new-article",
        icon: "mdi-marker",
        componentName: "ArticleForm",
        description: "Use this form to create a new article.",
        setupStep: 5,
        required: true,
        enabled: false,
        introMessage: 'Use this form to create a new article.',
        fieldGuides: [
            { field: "Article Title", description: "Enter a clear, descriptive title for your article." },
            { field: "Article Link", description: "Provide a URL where the full article can be read." },
            { field: "Article Description", description: "Write a brief summary or introduction to your article." }
        ]
    },
    {
        label: "Create a new post",
        value: "new-image",
        icon: "mdi-image",
        componentName: "PostForm",
        description: "Use this form to post a new blog post. Markdown supported.",
        setupStep: 6,
        required: true,
        enabled: false,
        introMessage: 'Use this form to post a new blog post.',
        fieldGuides: [
            { field: "Post Title", description: "Enter a title for your blog post." },
            { field: "Post Content", description: "Write your post content using Markdown for formatting." }
        ]
    },
    {
        label: "Delete a project",
        value: "delete-project",
        icon: "mdi-package",
        componentName: "DeleteProject",
        description: "Use this form to delete a project from the database.",
        setupStep: null,
        required: true,
        enabled: false,
        introMessage: 'Use this form to delete a project.'
    },
    {
        label: "Delete a guestbook",
        value: "delete-guestbook",
        icon: "mdi-comment",
        componentName: "DeleteGuestbookForm",
        description: "Use this form to delete a guestbook from the database.",
        setupStep: null,
        required: true,
        enabled: false,
        introMessage: 'Use this form to delete a guestbook.'
    },
];