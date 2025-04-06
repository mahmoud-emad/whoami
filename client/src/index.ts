export { };

declare global {
    interface Window {
        env: {
            SERVER_URL: string;
        };
    }
}
