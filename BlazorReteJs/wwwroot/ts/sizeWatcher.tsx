export class SizeWatcher {
    private element: HTMLElement;
    private observer: ResizeObserver;
    private handlers: Array<(width: number, height: number) => Promise<void>> = [];

    constructor(element: HTMLElement) {
        this.element = element;
        this.observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === this.element) {
                    const width = entry.contentRect.width;
                    const height = entry.contentRect.height;

                    this.handlers.forEach(async handler => {
                        try {
                            await handler(width, height);
                        } catch (error) {
                            console.error('Error in size change handler:', error);
                        }
                    });
                }
            }
        });
        this.observe();
    }

    private observe(): void {
        this.observer.observe(this.element);
    }

    addSizeChangeHandler(handler: (width: number, height: number) => Promise<void>): void {
        this.handlers.push(handler);
    }

    removeSizeChangeHandler(handler: (width: number, height: number) => Promise<void>): void {
        const index = this.handlers.indexOf(handler);
        if (index !== -1) {
            this.handlers.splice(index, 1);
        }
    }

    destroy(): void {
        this.observer.disconnect();
    }
}