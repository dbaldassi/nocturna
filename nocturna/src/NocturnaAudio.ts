import { AudioEngineV2, CreateAudioEngineAsync, CreateStreamingSoundAsync, StreamingSound } from "@babylonjs/core";


/**
 * NocturnaAudio manages all audio playback in Nocturna using Babylon.js's audio engine.
 * 
 * Responsibilities:
 * - Implements the singleton pattern to ensure only one audio manager exists.
 * - Initializes and unlocks the Babylon.js audio engine.
 * - Handles background music playback, including play, stop, resume, mute, and volume control.
 * - Ensures background music is properly disposed and replaced when changed.
 * 
 * Usage:
 * - Use `await NocturnaAudio.getInstance()` to get the singleton instance.
 * - Use `setBackgroundMusic` to play or change background music.
 * - Use `muteBackgroundMusic`, `stopBackgroundMusic`, `resumeBackgroundMusic`, and `setVolume` for playback control.
 */
export class NocturnaAudio {

    // Singleton instance
    private static instance: NocturnaAudio;
    private audioEngine: AudioEngineV2;
    private background: StreamingSound = null;
    private backgroundMuted: boolean = false;

    // Private constructor to prevent direct instantiation
    private constructor() {}

    /**
     * Initializes the Babylon.js audio engine asynchronously.
     */
    private async initialize(): Promise<void> {
        this.audioEngine = await CreateAudioEngineAsync();
        // Wait until audio engine is ready to play sounds.
        await this.audioEngine.unlockAsync();
    }

    /**
     * Unlocks the audio engine (required by some browsers before playback).
     */
    public async unlock(): Promise<void> {
        await this.audioEngine.unlockAsync();
    }

    /**
     * Returns the singleton instance of NocturnaAudio, initializing it if necessary.
     */
    public static async getInstance(): Promise<NocturnaAudio> {
        if (!NocturnaAudio.instance) {
            NocturnaAudio.instance = new NocturnaAudio();
            await NocturnaAudio.instance.initialize();
        }
        return NocturnaAudio.instance;
    }

    /**
     * Sets the global audio engine volume.
     * @param volume The volume level (0.0 to 1.0).
     */
    public setVolume(volume: number): void {
        if (this.audioEngine) {
            this.audioEngine.volume = volume;
        } else {
            console.warn("Audio engine is not initialized.");
        }
    }

    /**
     * Plays or changes the background music.
     * Disposes the previous background music if it exists.
     * @param musicUrl The URL of the music file to play.
     */
    public async setBackgroundMusic(musicUrl: string): Promise<void> {
        if(this.background) {
            this.background.stop();
            this.background.dispose();
        }

        this.background = await CreateStreamingSoundAsync("background", musicUrl, { loop: true, autoplay: true });
        if (this.background) {
            if(this.backgroundMuted) this.background.volume = 0; // Mute if previously muted
            else this.background.volume = 0.5; // Set default volume
            this.background.loop = true;
            this.background.play();
        }
    }

    /**
     * Stops the background music playback.
     */
    public stopBackgroundMusic(): void {
        if (this.background) {
            this.background.stop();
        } else {
            console.warn("No background music is currently playing.");
        }
    }

    /**
     * Resumes the background music playback if paused.
     */
    public resumeBackgroundMusic(): void {
        if (this.background) {
            this.background.resume();
        } else {
            console.warn("No background music is currently playing.");
        }
    }

    /**
     * Mutes or unmutes the background music.
     * @param mute True to mute, false to unmute.
     */
    public muteBackgroundMusic(mute: boolean): void {
        if (this.background) {
            this.background.volume = mute ? 0 : 0.5;
        } else {
            console.warn("No background music is currently playing.");
        }

        this.backgroundMuted = mute;
    }
}