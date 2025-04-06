import { CustomResponse, SettingsType } from "../types";
import { axios } from "./axios";
import ServerErrorNotification from "./notifications";

class SettingsAPI {
    /**
     * Get all settings
     * @returns {Promise<SettingsType>}
     * @static
    */
    static async getSettings(): Promise<SettingsType> {
        try {
            const response = await axios.get('/api/settings/')
            const res = response.data as CustomResponse<SettingsType>
            return res.results
        } catch (error: any) {
            // Display notification with the error message
            ServerErrorNotification.show({
                title: 'Error',
                message: error.message,
                type: 'error'
            });
            return {} as SettingsType
        }
    }

    /**
     * Update settings
     * @param {SettingsType} settings
     * @returns {Promise<SettingsType>}
     * @static
     */
    static async updateSettings(settings: SettingsType): Promise<SettingsType> {
        const response = await axios.put('/api/settings/', {
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        })
        const res = response.data as CustomResponse<SettingsType>
        return res.results
    }
}

export default SettingsAPI