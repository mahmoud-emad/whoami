import { CustomResponse, GuestBookType } from "../types"
import { axios } from "./axios"
import ServerErrorNotification from "./notifications"

class GuestbooksAPI {
    /**
     * Get all guestbooks
     * @returns {Promise<GuestBookType[]>}
     * @static
    */
    static async getGuestbooks(): Promise<GuestBookType[]> {
        try {
            const response = await axios.get('/api/guestbooks/')
            const res = response.data as CustomResponse<GuestBookType[]>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return []
        }
    }

    /**
     * Get a guestbook by id
     * @param {number} id
     * @returns {Promise<GuestBookType | null>}
     * @static     
    */
    static async getGuestbook(id: number): Promise<GuestBookType | null> {
        try {
            const response = await axios.get(`/api/guestbooks/${id}/`)
            const res = response.data as CustomResponse<GuestBookType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Create a guestbook
     * @param {GuestBookType} guestbook
     * @returns {Promise<GuestBookType | null>}
     * @static
    */
    static async createGuestbook(guestbook: GuestBookType): Promise<GuestBookType | null> {
        try {
            const response = await axios.post('/api/guestbooks/', {
                headers: {
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify(guestbook),
            })
            const res = response.data as CustomResponse<GuestBookType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Update a guestbook
     * @param {GuestBookType} guestbook
     * @returns {Promise<GuestBookType | null>}
     * @static
    */
    static async updateGuestbook(guestbook: GuestBookType): Promise<GuestBookType | null> {
        try {
            const response = await axios.put(`/api/guestbooks/${guestbook.id}/`, {
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(guestbook),
            })
            const res = response.data as CustomResponse<GuestBookType>
            return res.results
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return null
        }
    }

    /**
     * Delete a guestbook
     * @param {GuestBookType} guestbook
     * @returns {Promise<void>}
     * @static
    */
    static async deleteGuestbook(guestbook: GuestBookType): Promise<boolean> {
        try {
            await axios.delete(`/api/guestbooks/${guestbook.id}/`)
            return true
        } catch (error: any) {
            ServerErrorNotification.show({
                title: 'Error',
                message: error.response?.data?.message || error.message,
                type: 'error'
            });
            return false
        }
    }
}

export default GuestbooksAPI
