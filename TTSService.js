// TTSService.js
import * as Speech from 'expo-speech';

class TTSServiceClass {
  constructor() {
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentText = '';
    this.currentIndex = 0;
    this.onHighlight = null;
    this.sentences = [];
    this.currentUtterance = null;
  }

  // Split text into sentences for highlighting
  splitIntoSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
  }

  async speakWithHighlight(text, onHighlightCallback) {
    if (this.isSpeaking && !this.isPaused) {
      this.pause();
      return;
    }

    if (this.isPaused) {
      this.resume();
      return;
    }

    this.onHighlight = onHighlightCallback;
    this.sentences = this.splitIntoSentences(text);
    this.currentIndex = 0;
    this.isSpeaking = true;
    this.isPaused = false;
    
    await this.speakNextSentence();
  }

  async speakNextSentence() {
    if (this.currentIndex >= this.sentences.length || this.isPaused) {
      this.isSpeaking = this.currentIndex < this.sentences.length;
      return;
    }

    const sentence = this.sentences[this.currentIndex];
    
    // Highlight current sentence
    if (this.onHighlight) {
      this.onHighlight(this.currentIndex, sentence);
    }

    return new Promise((resolve) => {
      this.currentUtterance = Speech.speak(sentence, {
        language: 'en',
        rate: 0.8,
        onDone: () => {
          this.currentIndex++;
          if (this.currentIndex < this.sentences.length && !this.isPaused) {
            this.speakNextSentence();
          } else {
            this.isSpeaking = false;
            this.isPaused = false;
            if (this.onHighlight) {
              this.onHighlight(-1, ''); // Reset highlighting
            }
          }
          resolve();
        },
        onStopped: () => {
          this.isSpeaking = false;
          this.isPaused = false;
          resolve();
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isSpeaking = false;
          this.isPaused = false;
          resolve();
        }
      });
    });
  }

  pause() {
    if (this.isSpeaking && !this.isPaused) {
      Speech.stop();
      this.isPaused = true;
      return true;
    }
    return false;
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.speakNextSentence();
      return true;
    }
    return false;
  }

  stop() {
    Speech.stop();
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentIndex = 0;
    if (this.onHighlight) {
      this.onHighlight(-1, ''); // Reset highlighting
    }
  }

  getCurrentState() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalSentences: this.sentences.length,
      currentSentence: this.sentences[this.currentIndex] || ''
    };
  }
}

// Export a single instance
export const TTSService = new TTSServiceClass();