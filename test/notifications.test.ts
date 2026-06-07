import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notify, requestPermission } from '../src/lib/notifications';

function mockNotification(permission: NotificationPermission) {
    const ctor = vi.fn();
    Object.defineProperty(globalThis, 'Notification', {
        value: Object.assign(ctor, { permission }),
        writable: true,
        configurable: true,
    });
    return ctor;
}

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('notify', () => {
    it('creates a Notification when permission is granted', () => {
        const ctor = mockNotification('granted');
        notify('hello');
        expect(ctor).toHaveBeenCalledOnce();
        expect(ctor).toHaveBeenCalledWith('hello');
    });

    it('does nothing when permission is denied', () => {
        const ctor = mockNotification('denied');
        notify('hello');
        expect(ctor).not.toHaveBeenCalled();
    });

    it('does nothing when permission is default', () => {
        const ctor = mockNotification('default');
        notify('hello');
        expect(ctor).not.toHaveBeenCalled();
    });
});

describe('requestPermission', () => {
    it('calls requestPermission when state is default', () => {
        mockNotification('default');
        const spy = vi.fn().mockResolvedValue('granted');
        (globalThis.Notification as unknown as { requestPermission: typeof spy }).requestPermission = spy;
        requestPermission();
        expect(spy).toHaveBeenCalledOnce();
    });

    it('does nothing when permission is already granted', () => {
        mockNotification('granted');
        const spy = vi.fn();
        (globalThis.Notification as unknown as { requestPermission: typeof spy }).requestPermission = spy;
        requestPermission();
        expect(spy).not.toHaveBeenCalled();
    });

    it('does nothing when permission is already denied', () => {
        mockNotification('denied');
        const spy = vi.fn();
        (globalThis.Notification as unknown as { requestPermission: typeof spy }).requestPermission = spy;
        requestPermission();
        expect(spy).not.toHaveBeenCalled();
    });
});
