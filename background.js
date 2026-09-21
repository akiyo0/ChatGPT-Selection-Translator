// Copyright (C) 2026 Akiyo
// SPDX-License-Identifier: GPL-3.0-or-later

importScripts("providers.js");

const DEFAULT_MENU_LANGUAGES = ["Simplified Chinese", "English"];
const DEFAULT_TARGET_LANGUAGE = "Simplified Chinese";
const MENU_ID_PREFIX = "translate-to:";
const PARENT_MENU_ID = "chatgpt-translate-parent";

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["menuLanguages", "defaultTargetLanguage"]);
  const toSet = {};
  if (!existing.menuLanguages || !existing.menuLanguages.length) toSet.menuLanguages = DEFAULT_MENU_LANGUAGES;
  if (!existing.defaultTargetLanguage) toSet.defaultTargetLanguage = DEFAULT_TARGET_LANGUAGE;
  if (Object.keys(toSet).length) await chrome.storage.local.set(toSet);
  await rebuildContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.menuLanguages) {
    rebuildContextMenus();
  }
});

// onInstalled and storage.onChanged can both fire a rebuild almost at once at startup
// (the storage.local.set inside onInstalled itself triggers onChanged), so rebuilds must
// be queued and run one at a time - otherwise two overlapping removeAll()/create() calls
// race and Chrome reports "duplicate id" errors.
let menuRebuildChain = Promise.resolve();
function rebuildContextMenus() {
  menuRebuildChain = menuRebuildChain.catch(() => {}).then(doRebuildContextMenus);
  return menuRebuildChain;
}

async function doRebuildContextMenus() {
  const { menuLanguages } = await chrome.storage.local.get("menuLanguages");
  const langs = menuLanguages && menuLanguages.length ? menuLanguages : DEFAULT_MENU_LANGUAGES;
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: PARENT_MENU_ID, title: "ChatGPT Translate", contexts: ["selection"] });
  for (const lang of langs) {
    chrome.contextMenus.create({
      id: MENU_ID_PREFIX + lang,
      parentId: PARENT_MENU_ID,
      title: `Translate to ${lang}`,
      contexts: ["selection"],
    });
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || typeof info.menuItemId !== "string" || !info.menuItemId.startsWith(MENU_ID_PREFIX)) return;
  const targetLanguage = info.menuItemId.slice(MENU_ID_PREFIX.length);
  handleTranslate(tab, info.selectionText || "", targetLanguage);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "translate-selection") quickTranslate(tab);
});

chrome.action.onClicked.addListener((tab) => {
  quickTranslate(tab);
});

async function quickTranslate(tab) {
  if (!tab || tab.id == null) return;
  let selectionText = "";
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString(),
    });
    selectionText = (results && results[0] && results[0].result) || "";
  } catch (e) {
    selectionText = "";
  }
  const { defaultTargetLanguage } = await chrome.storage.local.get("defaultTargetLanguage");
  await handleTranslate(tab, selectionText, defaultTargetLanguage || DEFAULT_TARGET_LANGUAGE);
}

async function handleTranslate(tab, selectionText, targetLanguage) {
  if (!selectionText || !selectionText.trim()) {
    await deliverFinal(tab, {
      type: "SHOW_ERROR",
      message: "No text selected. Please select some text first; in PDFs, use the right-click menu instead.",
    });
    return;
  }

  const config = await loadProviderConfig();
  if (!config.apiKey && isApiKeyRequired(config)) {
    chrome.runtime.openOptionsPage();
    return;
  }

  notifyLoading(tab);

  try {
    const { sourceLanguage, translation } = await translateText(config, selectionText, targetLanguage);
    await deliverFinal(tab, {
      type: "SHOW_TRANSLATION",
      original: selectionText,
      sourceLanguage,
      targetLanguage,
      translation,
    });
  } catch (err) {
    await deliverFinal(tab, {
      type: "SHOW_ERROR",
      message: err.message || "Translation failed. Please try again later.",
    });
  }
}

async function notifyLoading(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_LOADING" });
  } catch (e) {
    // No content script on this page (e.g. the PDF viewer) - fine, the final result falls back to a popup window.
  }
}

async function deliverFinal(tab, payload) {
  try {
    await chrome.tabs.sendMessage(tab.id, payload);
    return;
  } catch (e) {
    // No content script yet - try injecting it once and retry.
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, payload);
    return;
  } catch (e) {
    // Still no luck (e.g. the PDF viewer) - fall back to a popup window.
  }
  await showInPopupWindow(payload);
}

async function showInPopupWindow(payload) {
  const id = crypto.randomUUID();
  await chrome.storage.session.set({ [id]: payload });
  await chrome.windows.create({
    url: chrome.runtime.getURL(`result.html?id=${id}`),
    type: "popup",
    width: 420,
    height: 420,
  });
}
