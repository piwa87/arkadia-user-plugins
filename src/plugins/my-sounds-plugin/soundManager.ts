export class SoundManager {
  private sounds: Map<string, string> = new Map();
  private audioContext: AudioContext | null = null;
  private debounceState: Map<string, boolean> = new Map();
  private soundEnabled: boolean = true;

  register(name: string, base64Data: string) {
    this.sounds.set(name, base64Data);
  }

  setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  async play(soundName: string, volume: number = 1.0) {
    if (!this.soundEnabled) return;

    const base64Data = this.sounds.get(soundName);
    if (!base64Data) {
      console.warn(`Sound "${soundName}" not found`);
      return;
    }

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error(`Failed to play sound "${soundName}":`, error);
    }
  }

  async playDebounced(soundName: string, debounceMs: number = 1000, volume: number = 1.0) {
    if (!this.soundEnabled) return;

    const key = `debounce_${soundName}`;
    const isActive = this.debounceState.get(key);

    if (isActive) {
      return; // Still in debounce window, ignore
    }

    // Play the sound and lock the debounce
    await this.play(soundName, volume);
    this.debounceState.set(key, true);

    // Re-enable after debounce period
    setTimeout(() => {
      this.debounceState.set(key, false);
    }, debounceMs);
  }

  stop() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
