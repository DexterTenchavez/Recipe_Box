import { Platform, Alert } from 'react-native';
import Tts from 'react-native-tts';

class TTSServiceClass {
    constructor() {
        this.isInitialized = false;
        this.currentState = {
            isSpeaking: false,
            isPaused: false,
            currentSentence: '',
            progress: 0
        };
        this.highlightCallback = null;
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.ttsAvailable = false;

        this.initTTS();
    }

    async initTTS() {
        try {
            console.log('🔄 Initializing TTS...');
            
            // Check if Tts is available
            if (Tts) {
                // Set up TTS configuration
                await Tts.setDefaultLanguage('en-US');
                await Tts.setDefaultRate(0.5);
                await Tts.setDefaultPitch(1.0);
                
                if (Platform.OS === 'ios') {
                    await Tts.setIgnoreSilentSwitch(true);
                }

                // Set up event listeners
                Tts.addEventListener('tts-start', this.onStart.bind(this));
                Tts.addEventListener('tts-finish', this.onFinish.bind(this));
                Tts.addEventListener('tts-cancel', this.onCancel.bind(this));

                this.isInitialized = true;
                this.ttsAvailable = true;
                console.log('✅ TTS initialized successfully');
            } else {
                console.log('❌ Tts module not available');
                this.ttsAvailable = false;
            }
        } catch (error) {
            console.error('❌ TTS initialization failed:', error);
            this.isInitialized = false;
            this.ttsAvailable = false;
        }
    }

    onStart(event) {
        this.currentState.isSpeaking = true;
        this.currentState.isPaused = false;
        console.log('TTS started');
    }

    onFinish(event) {
        this.currentState.isSpeaking = false;
        this.currentState.isPaused = false;
        this.currentSentenceIndex++;
        
        // If there are more sentences, speak the next one
        if (this.currentSentenceIndex < this.sentences.length) {
            this.speakNextSentence();
        } else {
            // All sentences completed
            this.resetState();
            if (this.highlightCallback) {
                this.highlightCallback(-1, '');
            }
        }
    }

    onCancel(event) {
        this.currentState.isSpeaking = false;
        this.currentState.isPaused = false;
        this.resetState();
        console.log('TTS cancelled');
    }

    resetState() {
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.currentState = {
            isSpeaking: false,
            isPaused: false,
            currentSentence: '',
            progress: 0
        };
    }

    splitIntoSentences(text) {
        // Improved sentence splitting
        if (!text) return [];
        
        return text
            .split(/(?<=[.!?])\s+/)
            .filter(sentence => sentence.trim().length > 0)
            .map(sentence => sentence.trim());
    }

    async speakWithHighlight(text, highlightCallback) {
        if (!this.ttsAvailable) {
            console.warn('TTS not available');
            Alert.alert('Voice Feature', 'Text-to-speech is not available on this device');
            return;
        }

        // Stop any current speech
        await this.stop();

        this.highlightCallback = highlightCallback;
        this.sentences = this.splitIntoSentences(text);
        this.currentSentenceIndex = 0;

        if (this.sentences.length > 0) {
            await this.speakNextSentence();
        }
    }

    async speakNextSentence() {
        if (this.currentSentenceIndex >= this.sentences.length) {
            return;
        }

        const sentence = this.sentences[this.currentSentenceIndex];
        this.currentState.currentSentence = sentence;

        // Call highlight callback
        if (this.highlightCallback) {
            this.highlightCallback(this.currentSentenceIndex, sentence);
        }

        try {
            await Tts.speak(sentence);
        } catch (error) {
            console.error('TTS speak error:', error);
            // Continue to next sentence even if there's an error
            this.onFinish({});
        }
    }

    async speak(text) {
        if (!this.ttsAvailable) {
            console.warn('TTS not available');
            // Fallback: show text in alert
            Alert.alert('Recipe Reading', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
            return;
        }

        await this.stop();
        try {
            await Tts.speak(text);
        } catch (error) {
            console.error('TTS speak error:', error);
            // Fallback to alert
            Alert.alert('Recipe Reading', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        }
    }

    async stop() {
        try {
            if (this.ttsAvailable) {
                await Tts.stop();
            }
            this.resetState();
            if (this.highlightCallback) {
                this.highlightCallback(-1, '');
            }
        } catch (error) {
            console.error('TTS stop error:', error);
        }
    }

    async pause() {
        if (this.currentState.isSpeaking && !this.currentState.isPaused && this.ttsAvailable) {
            try {
                await Tts.pause();
                this.currentState.isPaused = true;
            } catch (error) {
                console.error('TTS pause error:', error);
            }
        }
    }

    async resume() {
        if (this.currentState.isPaused && this.ttsAvailable) {
            try {
                await Tts.resume();
                this.currentState.isPaused = false;
            } catch (error) {
                console.error('TTS resume error:', error);
            }
        }
    }

    setRate(rate) {
        if (this.ttsAvailable) {
            Tts.setDefaultRate(Math.max(0.1, Math.min(rate, 1.0)));
        }
    }

    setPitch(pitch) {
        if (this.ttsAvailable) {
            Tts.setDefaultPitch(Math.max(0.5, Math.min(pitch, 2.0)));
        }
    }

    getCurrentState() {
        return { 
            ...this.currentState,
            ttsAvailable: this.ttsAvailable
        };
    }

    // Get available voices
    async getVoices() {
        try {
            if (this.ttsAvailable) {
                const voices = await Tts.voices();
                return voices;
            }
            return [];
        } catch (error) {
            console.error('Error getting voices:', error);
            return [];
        }
    }

    // Set specific voice
    async setVoice(voiceId) {
        try {
            if (this.ttsAvailable) {
                await Tts.setDefaultVoice(voiceId);
            }
        } catch (error) {
            console.error('Error setting voice:', error);
        }
    }

    // Check if TTS engine is available on device
    async checkEngine() {
        try {
            if (this.ttsAvailable) {
                const engines = await Tts.engines();
                return engines.length > 0;
            }
            return false;
        } catch (error) {
            console.error('Error checking TTS engines:', error);
            return false;
        }
    }

    // Check if TTS is ready to use
    isReady() {
        return this.ttsAvailable && this.isInitialized;
    }

    // Clean up resources
    destroy() {
        try {
            if (this.ttsAvailable) {
                Tts.removeAllListeners('tts-start');
                Tts.removeAllListeners('tts-finish');
                Tts.removeAllListeners('tts-cancel');
                Tts.stop();
            }
        } catch (error) {
            console.error('Error destroying TTS:', error);
        }
    }
}

// Create and export singleton instance
export const TTSService = new TTSServiceClass();
export default TTSService;