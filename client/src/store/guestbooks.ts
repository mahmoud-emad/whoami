import { defineStore } from "pinia";
import GuestbooksAPI from "../api/guestbooks";
import { GuestBookType } from "../types";

const useGuestbooksStore = defineStore('guestbooksStore', {
    state: () => ({
        guestbooks: [] as Array<GuestBookType>,
    }),
    getters: {
        getGuestbooks: (state): GuestBookType[] => state.guestbooks,
    },
    actions: {
        async fetchGuestbooks() {
            const data = await GuestbooksAPI.getGuestbooks();
            if (data) {
                this.guestbooks = data;
            }
        },

        async createGuestbook(guestbook: GuestBookType) {
            const data = await GuestbooksAPI.createGuestbook(guestbook);
            if (data) {
                this.guestbooks.push(data);
            }
        },

        async updateGuestbook(guestbook: GuestBookType) {
            const data = await GuestbooksAPI.updateGuestbook(guestbook);
            if (data) {
                this.guestbooks = this.guestbooks.map((p) =>
                    p.id === data.id ? data : p
                );
            }
        },

        async deleteGuestbook(guestbook: GuestBookType) {
            const success = await GuestbooksAPI.deleteGuestbook(guestbook);
            if (success !== false) {
                this.guestbooks = this.guestbooks.filter((p) => p.id !== guestbook.id);
            }
        }
    },
});

export default useGuestbooksStore;
