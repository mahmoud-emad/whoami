import axiosx from 'axios'

console.log(`API URL: ${window.env.SERVER_URL}`);

export const axios = axiosx.create({
    baseURL: window.env.SERVER_URL,
})