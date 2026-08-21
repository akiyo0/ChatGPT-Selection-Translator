# ChatGPT Selection Translator

Select text on any webpage or PDF, then translate it via the right-click menu, a keyboard shortcut, or the toolbar button. Results show up right there as a floating card or a small popup window - no tab switching needed.

## Install

1. Open `chrome://extensions`.
2. Turn on "Developer mode" (top right).
3. Click "Load unpacked" and select this folder (the one containing `manifest.json`).

## Set up your API key

1. Click the extension icon in the toolbar (clicking it with nothing selected also opens the settings page), or right-click the icon and choose "Options".
2. Create a key on the API Keys page at [platform.openai.com](https://platform.openai.com/) and paste it into the settings page.
   - This is a usage-billed OpenAI API key, separate from a ChatGPT subscription - your account needs available credit.
3. Adjust the model (default `gpt-4o-mini`), the default target language, and the right-click menu language list as needed.
4. Click "Test connection" to confirm the key works, then click "Save".

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
