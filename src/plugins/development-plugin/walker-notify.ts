import type { PluginApi } from '@arkadia/plugin-types';
import { notify, requestPermission } from '../../lib/notifications';

// WalkerState is not yet in published plugin-types — define it locally
interface WalkerState {
    active: boolean;
    paused: boolean;
    path: number[];
    currentIndex: number;
    target: number | null;
    delay: number;
}

export function setupWalkerNotify(api: PluginApi): () => void {
    requestPermission();

    let prevActive = false;

    const onUpdate = (state: WalkerState) => {
        // Arrival: was walking, now inactive and not paused (path completed normally)
        const arrived = prevActive && !state.active && !state.paused;
        prevActive = state.active;

        if (arrived) {
            notify('Walker: dotarłeś do celu');
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api.events as any).on('walker.update', onUpdate);

    return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api.events as any).off('walker.update', onUpdate);
    };
}
