function isSupported(): boolean {
    return typeof Notification !== 'undefined';
}

export function requestPermission(): void {
    if (!isSupported()) return;
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

export function notify(message: string): void {
    if (!isSupported()) return;
    if (Notification.permission === 'granted') {
        new Notification(message);
    }
}
