type NotificationType = 'success' | 'error' | 'normal';

class ServerErrorNotification extends Error {
    static timeoutId: number | null = null;
    static animationFrameId: number | null = null;

    static show(options: { title: string; message: string; type?: NotificationType }) {
        const type = options.type || 'normal';
        const card = document.getElementById('notification-card')!;
        const title = document.getElementById('notification-title')!;
        const message = document.getElementById('notification-message')!;

        // Set content and type-based styling
        card.className = `notification-card ${type}`;
        title.textContent = options.title;
        message.textContent = options.message;

        // Cancel previous animation if any
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        // Slide in the card from right
        this.animateRight(card, -400, 20);

        // Auto-hide after 5 seconds
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => this.hide(), 5000);

        // Enable drag-to-dismiss
        this.makeDraggable(card);

        // Throw error if applicable
        if (type === 'error') {
            throw new Error(`${options.title}: ${options.message}`);
        }
    }

    static hide() {
        const card = document.getElementById('notification-card')!;
        if (card) {
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
            this.animateRight(card, parseFloat(card.style.right || '20'), -400);
        }
    }

    private static animateRight(card: HTMLElement, from: number, to: number) {
        const duration = 300; // ms
        const start = performance.now();

        const animate = (time: number) => {
            const elapsed = time - start;
            const progress = Math.min(elapsed / duration, 1);
            const position = from + (to - from) * progress;
            card.style.right = `${position}px`;
            card.style.opacity = '1';

            if (progress < 1) {
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationFrameId = null;
                if (to === -400) card.style.opacity = '0';
            }
        };

        this.animationFrameId = requestAnimationFrame(animate);
    }

    static makeDraggable(card: HTMLElement) {
        let isDragging = false;
        let startX = 0;

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true;
            startX = e.clientX;
            card.style.transition = 'none';
            card.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const newRight = Math.max(-400, 20 - dx);
            card.style.right = `${newRight}px`;
        };

        const onMouseUp = (e: MouseEvent) => {
            if (!isDragging) return;
            isDragging = false;
            card.style.transition = 'right 0.5s ease-in-out';
            card.style.cursor = 'grab';

            const finalX = e.clientX;
            const totalDrag = finalX - startX;

            if (totalDrag < -100) {
                ServerErrorNotification.hide();
            } else {
                card.style.right = '20px';
            }
        };

        card.onmousedown = onMouseDown;
        window.onmousemove = onMouseMove;
        window.onmouseup = onMouseUp;
    }
}

export default ServerErrorNotification;
