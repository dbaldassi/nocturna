import { AudioEngineV2, CreateAudioEngineAsync, CreateStreamingSoundAsync, StreamingSound } from "@babylonjs/core";


export class NocturnaAudio {

    // singleton instance
    private static instance: NocturnaAudio;
    private audioEngine: AudioEngineV2;
    private background: StreamingSound = null;

    // private constructor to prevent instantiation
    private constructor() {
     
    }

    // static method to get the singleton instance

    private async initialize(): Promise<void> {
        this.audioEngine = await CreateAudioEngineAsync();
        // Wait until audio engine is ready to play sounds.
        await this.audioEngine.unlockAsync();
    }

    public static async getInstance(): Promise<NocturnaAudio> {
        if (!NocturnaAudio.instance) {
            NocturnaAudio.instance = new NocturnaAudio();
            await NocturnaAudio.instance.initialize();
        }
        return NocturnaAudio.instance;
    }

    public setVolume(volume: number): void {
        if (this.audioEngine) {
            this.audioEngine.volume = volume;
        } else {
            console.warn("Audio engine is not initialized.");
        }
    }

    public async setBackgroundMusic(musicUrl: string): Promise<void> {
        if(this.background) {
            this.background.stop();
            this.background.dispose();
        }

        this.background = await CreateStreamingSoundAsync("background", musicUrl, { loop: true, autoplay: true });
        if (this.background) {
            this.background.loop = true;
            this.background.play();
        }
    }

    public stopBackgroundMusic(): void {
        if (this.background) {
            this.background.stop();
        } else {
            console.warn("No background music is currently playing.");
        }
    }

    public resumeBackgroundMusic(): void {
        if (this.background) {
            this.background.resume();
        } else {
            console.warn("No background music is currently playing.");
        }
    }
}