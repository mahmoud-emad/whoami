import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/Home.vue';
import ContactView from '../views/Contact.vue';
import ProjectsView from '../views/Projects.vue';
import BlogView from '../views/Blog.vue';
import GuestbookView from '../views/Guestbook.vue';
import MoreView from '../views/More.vue';
import AdminSignatureView from '../views/AdminSignature.vue';
import AdminDashboardView from '../views/AdminDashboard.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            meta: { title: 'Home - Mahmoud Emad' },
        },
        {
            path: '/contact',
            name: 'contact',
            component: ContactView,
            meta: { title: 'Contact - Mahmoud Emad' },
        },
        {
            path: '/projects',
            name: 'projects',
            component: ProjectsView,
            meta: { title: 'Projects - Mahmoud Emad' },
        },
        {
            path: '/blog',
            name: 'blog',
            component: BlogView,
            meta: { title: 'blog - Mahmoud Emad' },
        },
        {
            path: '/guestbook',
            name: 'guestbook',
            component: GuestbookView,
            meta: { title: 'Guestbook - Mahmoud Emad' },
        },
        {
            path: '/more',
            name: 'more',
            component: MoreView,
            meta: { title: 'More - Mahmoud Emad' },
        },
        {
            path: '/admin-signature',
            name: 'admin-signature',
            component: AdminSignatureView,
            meta: { title: 'Admin Signature Validation - Mahmoud Emad' },
        },
        {
            path: '/admin-dashboard',
            name: 'admin-dashboard',
            component: AdminDashboardView,
            meta: { title: 'Admin Dashboard - Mahmoud Emad' },
        },
    ]
})

router.beforeEach((toRoute, fromRoute, next) => {
    window.document.title = toRoute.meta && toRoute.meta.title ? toRoute.meta.title as string : 'Home';
    next();
})

export default router
