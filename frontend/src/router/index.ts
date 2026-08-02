import { watch } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/Home.vue';
import ContactView from '../views/Contact.vue';
import ProjectsView from '../views/Projects.vue';
import BlogView from '../views/Blog.vue';
import GuestbookView from '../views/Guestbook.vue';
import MoreView from '../views/More.vue';
import AdminSignatureView from '../views/AdminSignature.vue';
import AdminDashboardView from '../views/AdminDashboard.vue';
import NotFoundView from '../views/NotFound.vue';
import SearchView from '../views/Search.vue';
import ListsView from '../views/Lists.vue';
import ListDetailView from '../views/ListDetail.vue';
import BooksView from '../views/Books.vue';
import { verifySession } from '../utils/api';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { title: 'Home' },
        },
        {
            path: '/contact',
            name: 'contact',
            component: ContactView,
            meta: { title: 'Contact' },
        },
        {
            path: '/projects',
            name: 'projects',
            component: ProjectsView,
            meta: { title: 'Projects' },
        },
        {
            path: '/blog',
            name: 'blog',
            component: BlogView,
            meta: { title: 'Blog' },
        },
        {
            path: '/guestbook',
            name: 'guestbook',
            component: GuestbookView,
            meta: { title: 'Guestbook' },
        },
        {
            path: '/more',
            name: 'more',
            component: MoreView,
            meta: { title: 'More' },
        },
        {
            path: '/lists',
            name: 'Lists',
            component: ListsView,
            meta: { title: 'Lists' },
        },
        {
            // Addressed by slug rather than id, so a bookmarked plan keeps a readable URL.
            path: '/lists/:slug',
            name: 'List',
            component: ListDetailView,
            meta: { title: 'List' },
        },
        {
            path: '/books',
            name: 'books',
            component: BooksView,
            meta: { title: 'Books' },
        },
        {
            path: '/search',
            name: 'search',
            component: SearchView,
            meta: { title: 'Search' },
        },
        {
            // The login lives at a plain path and is not linked from anywhere in the site chrome,
            // so nothing advertises it to visitors. The title stays generic for the same reason —
            // it ends up in the browser tab and in history.
            path: '/admin',
            name: 'admin',
            component: AdminSignatureView,
            meta: { title: 'Sign in' },
        },
        {
            // Previous location of the login. Kept as a redirect so bookmarks, and the redirect
            // SettingsForm performs after disabling the dashboard, keep working.
            path: '/admin-signature',
            redirect: { name: 'admin' },
        },
        {
            path: '/admin-dashboard',
            name: 'admin-dashboard',
            component: AdminDashboardView,
            meta: { title: 'Admin Dashboard', requiresAuth: true },
        },
        {
            // The More page links to pages that do not exist yet (/uses, /impossible-list, …).
            // Without this the router matched nothing and rendered a blank page under the navbar,
            // which looks like the site is broken. Anything unmatched now lands somewhere sane.
            path: '/:pathMatch(.*)*',
            name: 'not-found',
            component: NotFoundView,
            meta: { title: 'Page not found' },
        },
    ]
})

// The page currently being shown. Kept here so the title can be recomposed when the brand name
// arrives from the backend, which happens after the first navigation has already run.
let currentPageName = 'Home';
let watchingBrand = false;

const applyTitle = (brandName: string) => {
    window.document.title = brandName ? `${currentPageName} - ${brandName}` : currentPageName;
};

router.beforeEach(async (toRoute, _fromRoute, next) => {
    // The site owner's name is not baked into the route table any more; only the bare page name is.
    // The full document title is composed here, at navigation time, so a fresh clone shows plain
    // "Contact" until someone configures a brand name.
    //
    // The store is imported lazily: this module is evaluated while the app is being created, which
    // can happen before app.use(pinia), and calling useSettingsStore() at module scope would throw
    // "getActivePinia() was called with no active Pinia".
    currentPageName = (toRoute.meta?.title as string) || 'Home';
    try {
        const { useSettingsStore } = await import('../store');
        const settingsStore = useSettingsStore();
        if (!watchingBrand) {
            // Settings load asynchronously, so the very first navigation usually happens before the
            // brand name exists. Re-title once it does instead of leaving that page name bare.
            watchingBrand = true;
            watch(
                () => settingsStore.profile?.brand?.displayName,
                (name) => applyTitle((name || '').trim())
            );
        }
        applyTitle(settingsStore.profile?.brand?.displayName?.trim() || '');
    } catch {
        // Store unavailable (backend down, Pinia not ready) — the page name on its own is a correct
        // title, just a shorter one.
        applyTitle('');
    }

    // Guard admin routes. This is convenience, not the security boundary — the backend rejects
    // every unauthenticated write regardless of what the router allows.
    if (toRoute.meta?.requiresAuth && !(await verifySession())) {
        return next({ name: 'admin' });
    }

    next();
})

export default router
