// Copyright (C) 2026 Akiyo
// SPDX-License-Identifier: GPL-3.0-or-later

const LANGUAGE_OPTIONS = [
  "Simplified Chinese",
  "Traditional Chinese",
  "English",
  "Japanese",
  "Korean",
  "French",
  "Spanish",
  "German",
];
const CUSTOM_VALUE = "__custom__";
const DEFAULT_MENU_LANGUAGES = ["Simplified Chinese", "English"];
const DEFAULT_TARGET_LANGUAGE = "Simplified Chinese";

const PROVIDER_UI = {
  openai: {
    providerHint:
      "Works with OpenAI and any service exposing an OpenAI-style /chat/completions endpoint, e.g. DeepSeek, OpenRouter, Groq, or a local Ollama / LM Studio server.",
    baseUrlHint:
      "Everything before /chat/completions. Default: https://api.openai.com/v1. Examples: https://api.deepseek.com/v1, https://openrouter.ai/api/v1, http://localhost:11434/v1.",
    apiKeyPlaceholder: "sk-...",
    apiKeyHint:
      "For OpenAI, create one on the API Keys page at platform.openai.com - billed by usage, separate from a ChatGPT subscription. Local servers that don't check keys can leave it empty.",
    modelHint: "Defaults to gpt-4o-mini. Enter any model name your endpoint supports.",
  },
  gemini: {
    providerHint:
      "Works with Google's Gemini API and proxies that expose the same /models/<model>:generateContent endpoint.",
    baseUrlHint:
      "Everything before /models/<model>:generateContent. Default: https://generativelanguage.googleapis.com/v1beta.",
    apiKeyPlaceholder: "AIza...",
    apiKeyHint: "For Gemini, create one at aistudio.google.com. It is sent in the x-goog-api-key header.",
    modelHint: "Defaults to gemini-2.5-flash. Enter any model name your endpoint supports.",
  },
};

let menuLanguages = [...DEFAULT_MENU_LANGUAGES];

// Unsaved form values for every provider, so switching the API type doesn't lose what was typed.
const providerForms = Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, providerSettingsFrom({}, p)]));
let activeProvider = DEFAULT_PROVIDER;

function readProviderFields() {
  return {
    apiKey: document.getElementById("apiKey").value.trim(),
    model: document.getElementById("model").value.trim(),
    baseUrl: normalizeBaseUrl(document.getElementById("baseUrl").value),
  };
}

function showProvider(provider) {
  activeProvider = provider;
  const form = providerForms[provider];
  const ui = PROVIDER_UI[provider];
  document.getElementById("provider").value = provider;
  document.getElementById("baseUrl").value = form.baseUrl;
  document.getElementById("baseUrl").placeholder = PROVIDERS[provider].defaultBaseUrl;
  document.getElementById("apiKey").value = form.apiKey;
  document.getElementById("apiKey").placeholder = ui.apiKeyPlaceholder;
  document.getElementById("model").value = form.model;
  document.getElementById("model").placeholder = PROVIDERS[provider].defaultModel;
  document.getElementById("providerHint").textContent = ui.providerHint;
  document.getElementById("baseUrlHint").textContent = ui.baseUrlHint;
  document.getElementById("apiKeyHint").textContent = ui.apiKeyHint;
  document.getElementById("modelHint").textContent = ui.modelHint;
}

// The config currently shown in the form, with defaults filled in for empty fields.
function activeConfig() {
  const fields = readProviderFields();
  const defaults = PROVIDERS[activeProvider];
  return {
    provider: activeProvider,
    apiKey: fields.apiKey,
    model: fields.model || defaults.defaultModel,
    baseUrl: fields.baseUrl || defaults.defaultBaseUrl,
  };
}

// Must be called before anything else is awaited in a click handler: Chrome only shows the
// permission prompt while the user gesture is still active.
async function requestHostPermission(pattern) {
  try {
    return await chrome.permissions.request({ origins: [pattern] });
  } catch (e) {
    return false;
  }
}

function showStatus(text, duration) {
  const status = document.getElementById("status");
  status.textContent = text;
  if (duration) {
    setTimeout(() => {
      if (status.textContent === text) status.textContent = "";
    }, duration);
  }
}

function fillLanguageSelect(select) {
  select.innerHTML = "";
  for (const lang of LANGUAGE_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = lang;
    opt.textContent = lang;
    select.appendChild(opt);
  }
  const customOpt = document.createElement("option");
  customOpt.value = CUSTOM_VALUE;
  customOpt.textContent = "Custom…";
  select.appendChild(customOpt);
}

function setupCustomToggle(select, customInput) {
  select.addEventListener("change", () => {
    customInput.classList.toggle("hidden", select.value !== CUSTOM_VALUE);
    if (select.value !== CUSTOM_VALUE) customInput.value = "";
  });
}

function selectedLanguageValue(select, customInput) {
  if (select.value === CUSTOM_VALUE) return customInput.value.trim();
  return select.value;
}

function renderMenuLangList() {
  const list = document.getElementById("menuLangList");
  list.innerHTML = "";
  menuLanguages.forEach((lang, index) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = lang;
    li.appendChild(span);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.disabled = menuLanguages.length <= 1;
    removeBtn.addEventListener("click", () => {
      menuLanguages.splice(index, 1);
      renderMenuLangList();
    });
    li.appendChild(removeBtn);

    list.appendChild(li);
  });
}

async function load() {
  const defaultTargetSelect = document.getElementById("defaultTargetLanguage");
  const defaultTargetCustom = document.getElementById("defaultTargetLanguageCustom");
  const menuLangSelect = document.getElementById("menuLangSelect");
  const menuLangCustom = document.getElementById("menuLangCustom");

  fillLanguageSelect(defaultTargetSelect);
  fillLanguageSelect(menuLangSelect);
  setupCustomToggle(defaultTargetSelect, defaultTargetCustom);
  setupCustomToggle(menuLangSelect, menuLangCustom);

  const stored = await chrome.storage.local.get([
    "provider",
    ...allProviderStorageKeys(),
    "defaultTargetLanguage",
    "menuLanguages",
  ]);

  for (const provider of Object.keys(PROVIDERS)) providerForms[provider] = providerSettingsFrom(stored, provider);
  showProvider(PROVIDERS[stored.provider] ? stored.provider : DEFAULT_PROVIDER);

  const targetLang = stored.defaultTargetLanguage || DEFAULT_TARGET_LANGUAGE;
  if (LANGUAGE_OPTIONS.includes(targetLang)) {
    defaultTargetSelect.value = targetLang;
  } else {
    defaultTargetSelect.value = CUSTOM_VALUE;
    defaultTargetCustom.classList.remove("hidden");
    defaultTargetCustom.value = targetLang;
  }

  menuLanguages =
    stored.menuLanguages && stored.menuLanguages.length ? [...stored.menuLanguages] : [...DEFAULT_MENU_LANGUAGES];
  renderMenuLangList();
}

function setupHandlers() {
  document.getElementById("provider").addEventListener("change", (e) => {
    providerForms[activeProvider] = readProviderFields();
    showProvider(e.target.value);
  });

  document.getElementById("toggleKey").addEventListener("click", () => {
    const input = document.getElementById("apiKey");
    const btn = document.getElementById("toggleKey");
    if (input.type === "password") {
      input.type = "text";
      btn.textContent = "Hide";
    } else {
      input.type = "password";
      btn.textContent = "Show";
    }
  });

  document.getElementById("addMenuLang").addEventListener("click", () => {
    const select = document.getElementById("menuLangSelect");
    const custom = document.getElementById("menuLangCustom");
    const lang = selectedLanguageValue(select, custom);
    if (!lang || menuLanguages.includes(lang)) return;
    menuLanguages.push(lang);
    renderMenuLangList();
    custom.value = "";
    custom.classList.add("hidden");
    select.selectedIndex = 0;
  });

  document.getElementById("openShortcuts").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  document.getElementById("save").addEventListener("click", async () => {
    const config = activeConfig();
    const pattern = hostPermissionPattern(config.baseUrl);
    if (!pattern) {
      showStatus("Invalid API base URL", 4000);
      return;
    }
    const granted = await requestHostPermission(pattern);

    providerForms[activeProvider] = readProviderFields();
    const defaultTargetSelect = document.getElementById("defaultTargetLanguage");
    const defaultTargetCustom = document.getElementById("defaultTargetLanguageCustom");
    const defaultTargetLanguage =
      selectedLanguageValue(defaultTargetSelect, defaultTargetCustom) || DEFAULT_TARGET_LANGUAGE;

    if (menuLanguages.length === 0) menuLanguages = [...DEFAULT_MENU_LANGUAGES];

    const toSave = {
      provider: activeProvider,
      defaultTargetLanguage,
      menuLanguages: [...menuLanguages],
    };
    for (const [provider, keys] of Object.entries(PROVIDER_STORAGE_KEYS)) {
      const form = providerForms[provider];
      toSave[keys.apiKey] = form.apiKey;
      toSave[keys.model] = form.model || PROVIDERS[provider].defaultModel;
      toSave[keys.baseUrl] = form.baseUrl || PROVIDERS[provider].defaultBaseUrl;
    }
    await chrome.storage.local.set(toSave);

    if (granted) showStatus("Saved", 2000);
    else showStatus("Saved, but access to this host wasn't granted - requests to it may be blocked", 6000);
  });

  document.getElementById("testConnection").addEventListener("click", async () => {
    const config = activeConfig();
    const pattern = hostPermissionPattern(config.baseUrl);
    if (!pattern) {
      showStatus("Invalid API base URL", 4000);
      return;
    }
    if (!config.apiKey && isApiKeyRequired(config)) {
      showStatus("Please enter an API key first", 4000);
      return;
    }
    await requestHostPermission(pattern);

    const defaultTargetLanguage =
      selectedLanguageValue(
        document.getElementById("defaultTargetLanguage"),
        document.getElementById("defaultTargetLanguageCustom")
      ) || DEFAULT_TARGET_LANGUAGE;
    showStatus("Testing…");
    try {
      const { translation } = await translateText(config, "Hello", defaultTargetLanguage);
      showStatus(`Connected successfully ("Hello" → "${translation}")`, 6000);
    } catch (e) {
      showStatus("Failed: " + e.message, 8000);
    }
  });
}

load();
setupHandlers();
