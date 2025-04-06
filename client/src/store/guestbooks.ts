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
            this.guestbooks = data;
        },

        async createGuestbook(guestbook: GuestBookType) {
            const data = await GuestbooksAPI.createGuestbook(guestbook)
            this.guestbooks.push(data);
        },

        async updateGuestbook(guestbook: GuestBookType) {
            const data = await GuestbooksAPI.updateGuestbook(guestbook)
            this.guestbooks = this.guestbooks.map((p) => {
                if (p.id === data.id) {
                    return data;
                }
                return p;
            });
        },

        async deleteGuestbook(guestbook: GuestBookType) {
            await GuestbooksAPI.deleteGuestbook(guestbook);
            this.guestbooks = this.guestbooks.filter((p) => p.id !== guestbook.id);
        }
    },
});

export default useGuestbooksStore;