# ChatGPT Selection Translator

Select text on any webpage or PDF, then translate it via the right-click menu, a keyboard shortcut, or the toolbar button. Results show up right there as a floating card or a small popup window - no tab switching needed.

Works with the OpenAI API, the Gemini API, and any service that speaks either format (DeepSeek, OpenRouter, Groq, a local Ollama / LM Studio server, Gemini proxies, ...).

## Install

1. Open `chrome://extensions`.
2. Turn on "Developer mode" (top right).
3. Click "Load unpacked" and select this folder (the one containing `manifest.json`).

## Set up your API

1. Click the extension icon in the toolbar (clicking it with nothing selected also opens the settings page), or right-click the icon and choose "Options".
2. Pick an **API type**:
   - **ChatGPT (OpenAI-compatible API)** - OpenAI itself, or any service with an OpenAI-style `/chat/completions` endpoint.
   - **Gemini (Gemini-compatible API)** - Google's Gemini API, or a proxy with the same `/models/<model>:generateContent` endpoint.
3. Set the **API base URL** (leave the default for the official APIs) and paste your **API key**:
   - OpenAI: create a key on the API Keys page at [platform.openai.com](https://platform.openai.com/). This is a usage-billed key, separate from a ChatGPT subscription - your account needs available credit.
   - Gemini: create a key at [aistudio.google.com](https://aistudio.google.com/).
   - Self-hosted servers that don't check keys (e.g. Ollama) can leave the key empty.
4. Set the **model** (defaults: `gpt-4o-mini` / `gemini-2.5-flash`), the default target language, and the right-click menu language list as needed.
5. Click "Test connection" to confirm everything works, then click "Save". Each API type keeps its own base URL, key and model, so you can switch back and forth without re-entering them.

Base URL examples:

| Service | API type | Base URL |
| --- | --- | --- |
| OpenAI | OpenAI-compatible | `https://api.openai.com/v1` (default) |
| DeepSeek | OpenAI-compatible | `https://api.deepseek.com/v1` |
| OpenRouter | OpenAI-compatible | `https://openrouter.ai/api/v1` |
| Ollama (local) | OpenAI-compatible | `http://localhost:11434/v1` |
| LM Studio (local) | OpenAI-compatible | `http://localhost:1234/v1` |
| Google Gemini | Gemini-compatible | `https://generativelanguage.googleapis.com/v1beta` (default) |

For OpenAI-compatible services, enter everything before `/chat/completions`; for Gemini-compatible ones, everything before `/models/<model>:generateContent`. When you save or test a custom base URL, Chrome may ask to let the extension access that host - allow it, otherwise requests can be blocked.

## Three ways to translate

1. **Right-click menu**: select text → right-click → "ChatGPT Translate" → pick a specific language (e.g. "Translate to English"). The languages in this submenu are managed on the settings page. Works on both webpages and **PDFs**.
2. **Keyboard shortcut**: defaults to `Ctrl+Shift+Y` (`Command+Shift+Y` on Mac), changeable at `chrome://extensions/shortcuts`. Select text and press the shortcut to translate straight into the "default target language" from settings.
3. **Toolbar button**: select text and click the extension icon in the toolbar - same behavior as the shortcut (uses the default target language).

> **Note**: the keyboard shortcut and toolbar button can't read selected text inside Chrome's built-in PDF viewer (Chrome doesn't let extensions inject scripts into it - this is a browser limitation that can't be worked around). **For PDFs, use the right-click menu instead** - it's triggered natively by the browser based on the current selection, so it works on both webpages and PDFs.

## Local PDF files (file:// URLs)

If a PDF is opened directly from disk (the address bar shows `file:///...`), Chrome blocks all extensions from accessing local files by default. You'll need to enable it manually:

1. `chrome://extensions` → find this extension → click "Details".
2. Turn on "Allow access to file URLs".

This is a Chrome security restriction - it can only be enabled manually and can't be turned on automatically by the extension.

## Known limitations

- Scanned / image-only PDFs (no text layer, nothing to select) can't be translated - that's a limitation of the PDF itself, and this extension doesn't do OCR.
- Translation quality and speed depend on the model you choose and your network connection.

## License

Copyright (C) 2026 Akiyo

Licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0-or-later).

https://buymeacoffee.com/akiyo0/e/568223
