# 🌙 Nocturne
> **The ultimate web reading companion. Immersive reader, Neural TTS, and AI-powered comprehension.**

Nocturne is a sophisticated browser extension designed for power readers. It strips away web clutter and replaces it with a high-end reading environment, featuring human-like neural voices and an integrated AI assistant to help you define, translate, or paraphrase content in real-time.

## ✨ Key Features

### 📖 Immersive Reading Mode
- **Zero Distraction:** Removes ads, popups, and sidebars for a focused reading experience.
- **Custom Typography:** Choose from curated themes (Gemini, Electra) and optimize font size, line height, and letter spacing.
- **Bionic Reading:** Optional high-contrast focus mode to increase reading speed and retention.

### 🎙️ Neural TTS & Jigsaw Voices
- **Human-Like Audio:** Powered by high-quality neural voices.
- **Jigsaw Integration:** Advanced voice management for a seamless "Listen while you read" experience.
- **Smart Highlighting:** Synchronized word-level highlighting as the text is read aloud.

### 🤖 Integrated AI (Powered by Groq)
- **Explain & Define:** Highlight any text to get instant AI-generated explanations.
- **Auto-Paraphrase:** Use `Ctrl+Shift+Y` to rewrite complex paragraphs into simpler language.
- **Chat with Page:** Ask questions directly to the document you are reading.
- **Multi-Key Load Balancing:** Supports parallel fetching across multiple API keys for maximum speed.

### 🛠 Productivity Tools
- **Scan & Skim:** Visual aids to help you breeze through long-form articles.
- **Word Replace:** Create custom "Replace" lists to swap terminology or simplify jargon across the web.
- **Site-Specific Rules:** Set specific domains to automatically trigger "Immersive Mode" or "AI Mode."

## 🚀 Installation

1. Clone or download this repository.
2. Install dependencies (for the build system): `npm install`.
3. Build the production version: `node build.js`.
4. Open Chrome and go to `chrome://extensions/`.
5. Enable **Developer mode** and click **Load unpacked**.
6. Select the `dist/` folder created by the build script.

## ⚙️ Configuration
To enable AI features:
1. Open the extension popup.
2. Navigate to the ✨ **AI Tab**.
3. Enter your **Groq API Key**.

## 🛠 Technical Overview
- **Manifest V3**: Modern, secure, and performant extension architecture.
- **Build System**: Includes a custom `build.js` using `esbuild` for minification and optimization.
- **State Management**: Uses `chrome.storage.local` for heavy site rules and `storage.sync` for cross-device settings.

---
MIT © Adib Jawad
