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
const DEFAULT_MODEL = "gpt-4o-mini";

let menuLanguages = [...DEFAULT_MENU_LANGUAGES];

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

  const stored = await chrome.storage.local.get(["apiKey", "model", "defaultTargetLanguage", "menuLanguages"]);

  document.getElementById("apiKey").value = stored.apiKey || "";
  document.getElementById("model").value = stored.model || DEFAULT_MODEL;

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
    const apiKey = document.getElementById("apiKey").value.trim();
    const model = document.getElementById("model").value.trim() || DEFAULT_MODEL;
    const defaultTargetSelect = document.getElementById("defaultTargetLanguage");
    const defaultTargetCustom = document.getElementById("defaultTargetLanguageCustom");
    const defaultTargetLanguage =
      selectedLanguageValue(defaultTargetSelect, defaultTargetCustom) || DEFAULT_TARGET_LANGUAGE;

    if (menuLanguages.length === 0) menuLanguages = [...DEFAULT_MENU_LANGUAGES];

    await chrome.storage.local.set({
      apiKey,
      model,
      defaultTargetLanguage,
      menuLanguages: [...menuLanguages],
    });

    const status = document.getElementById("status");
    status.textContent = "Saved";
    setTimeout(() => (status.textContent = ""), 2000);
  });

  document.getElementById("testConnection").addEventListener("click", async () => {
    const status = document.getElementById("status");
    const apiKey = document.getElementById("apiKey").value.trim();
    const model = document.getElementById("model").value.trim() || DEFAULT_MODEL;
    if (!apiKey) {
      status.textContent = "Please enter an API key first";
      return;
    }
    status.textContent = "Testing…";
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 5,
        }),
      });
      if (response.ok) {
        status.textContent = "Connected successfully";
      } else {
        const data = await response.json().catch(() => ({}));
        status.textContent = "Failed: " + ((data.error && data.error.message) || `HTTP ${response.status}`);
      }
    } catch (e) {
      status.textContent = "Failed: " + e.message;
    }
    setTimeout(() => (status.textContent = ""), 4000);
  });
}

load();
setupHandlers();
