import { CustomResponse, SettingsType } from "../types";
import { axios } from "./axios";
import ServerErrorNotification from "./notifications";

class SettingsAPI {
    /**
     * Get all settings
     * @returns {Promise<SettingsType>}
     * @static
     */
    static async getSettings(): Promise<SettingsType | null> {
        try {
            const response = await axios.get('/api/dashboard/')
            const res = response.data as CustomResponse<SettingsType>
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
     * Update settings
     * @param {SettingsType} settings
     * @returns {Promise<SettingsType | null>}
     * @static
     */
    static async updateSettings(settings: SettingsType): Promise<SettingsType | null> {
        try {
            const response = await axios.put('/api/dashboard/', settings, {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            const res = response.data as CustomResponse<SettingsType>
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
}

export default SettingsAPI;
