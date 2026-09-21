// Copyright (C) 2026 Akiyo
// SPDX-License-Identifier: GPL-3.0-or-later

// Translation API providers. Shared by background.js (via importScripts) and options.js
// (via a <script> tag), so everything here lives in the global scope.

const PROVIDERS = {
  openai: {
    label: "OpenAI-compatible API",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    label: "Gemini API",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
  },
};
const DEFAULT_PROVIDER = "openai";

// chrome.storage.local keys for each provider's settings. The OpenAI ones keep their
// original names (apiKey / model) so settings saved by earlier versions carry over.
const PROVIDER_STORAGE_KEYS = {
  openai: { apiKey: "apiKey", model: "model", baseUrl: "openaiBaseUrl" },
  gemini: { apiKey: "geminiApiKey", model: "geminiModel", baseUrl: "geminiBaseUrl" },
};

function allProviderStorageKeys() {
  return Object.values(PROVIDER_STORAGE_KEYS).flatMap((keys) => Object.values(keys));
}

// Settings for one provider, filling in defaults for anything not stored.
function providerSettingsFrom(stored, provider) {
  const keys = PROVIDER_STORAGE_KEYS[provider];
  return {
    apiKey: stored[keys.apiKey] || "",
    model: stored[keys.model] || PROVIDERS[provider].defaultModel,
    baseUrl: stored[keys.baseUrl] || PROVIDERS[provider].defaultBaseUrl,
  };
}

async function loadProviderConfig() {
  const stored = await chrome.storage.local.get(["provider", ...allProviderStorageKeys()]);
  const provider = PROVIDERS[stored.provider] ? stored.provider : DEFAULT_PROVIDER;
  return { provider, ...providerSettingsFrom(stored, provider) };
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "").trim().replace(/\/+$/, "");
}

// The official endpoints need a key; self-hosted compatible servers (Ollama, LM Studio, ...)
// often don't check one, so a custom base URL may be used without a key.
function isApiKeyRequired(config) {
  return normalizeBaseUrl(config.baseUrl) === PROVIDERS[config.provider].defaultBaseUrl;
}

// Match pattern covering the base URL's host on any port (for chrome.permissions),
// or null if the base URL isn't a valid http(s) URL.
function hostPermissionPattern(baseUrl) {
  try {
    const url = new URL(normalizeBaseUrl(baseUrl));
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.protocol}//${url.hostname}/*`;
  } catch (e) {
    return null;
  }
}

async function translateText(config, text, targetLanguage) {
  if (!hostPermissionPattern(config.baseUrl)) {
    throw new Error(`Invalid API base URL: ${config.baseUrl}`);
  }
  const content =
    config.provider === "gemini"
      ? await callGemini(config, text, targetLanguage)
      : await callOpenAICompatible(config, text, targetLanguage);
  return parseTranslation(content);
}

function buildSystemPrompt(targetLanguage) {
  return (
    `You are a professional translation assistant. First identify the source language of the text provided by the user, then translate it into ${targetLanguage}. ` +
    `Respond with strictly the following JSON format and nothing else: {"sourceLanguage": "the name of the source language in English, e.g. “Japanese” or “French”", "translation": "the translated text"}`
  );
}

async function callOpenAICompatible(config, text, targetLanguage) {
  const base = normalizeBaseUrl(config.baseUrl);
  const url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
  const headers = config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {};
  const request = (jsonMode) =>
    postJson(url, headers, {
      model: config.model,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      temperature: 0.3,
      messages: [
        { role: "system", content: buildSystemPrompt(targetLanguage) },
        { role: "user", content: text },
      ],
    });

  let response = await request(true);
  if (response.status === 400 || response.status === 422) {
    // Some compatible servers (e.g. LM Studio) reject JSON mode. Retry once without it -
    // the prompt still asks for JSON, and parseTranslation copes with looser replies.
    const message = await readErrorMessage(response, PROVIDERS.openai.label);
    if (!/response_format|json_object/i.test(message)) throw new Error(message);
    response = await request(false);
  }
  if (!response.ok) throw new Error(await readErrorMessage(response, PROVIDERS.openai.label));

  const data = await response.json();
  const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
  if (!content) throw new Error("The API returned an empty response.");
  return content;
}

async function callGemini(config, text, targetLanguage) {
  const model = config.model.replace(/^models\//, "");
  const url = `${normalizeBaseUrl(config.baseUrl)}/models/${encodeURIComponent(model)}:generateContent`;
  const headers = config.apiKey ? { "x-goog-api-key": config.apiKey } : {};
  // temperature is left at its default: Google documents that lowering it degrades Gemini 3 models.
  const response = await postJson(url, headers, {
    systemInstruction: { parts: [{ text: buildSystemPrompt(targetLanguage) }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { responseMimeType: "application/json" },
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, PROVIDERS.gemini.label));

  const data = await response.json();
  const candidate = data.candidates && data.candidates[0];
  const parts = (candidate && candidate.content && candidate.content.parts) || [];
  const content = parts
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("");
  if (!content) {
    const reason = (data.promptFeedback && data.promptFeedback.blockReason) || (candidate && candidate.finishReason);
    throw new Error(reason ? `Gemini returned no text (${reason}).` : "Gemini returned an empty response.");
  }
  return content;
}

async function postJson(url, headers, body) {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(
      `Could not reach ${new URL(url).origin}. Check the API base URL and your network, ` +
        `then save the settings again so the extension can request access to this host.`
    );
  }
}

async function readErrorMessage(response, label) {
  let message = `${label} request failed (HTTP ${response.status})`;
  try {
    let errJson = await response.json();
    if (Array.isArray(errJson)) errJson = errJson[0];
    if (errJson && errJson.error && errJson.error.message) message = errJson.error.message;
  } catch (e) {
    // ignore
  }
  return message;
}

function parseTranslation(content) {
  // Compatible endpoints may ignore JSON mode and wrap the JSON in a code fence, or
  // prefix it with a <think> block, so pull out the outermost {...} before parsing.
  const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (parsed && typeof parsed.translation === "string") {
        return {
          sourceLanguage: typeof parsed.sourceLanguage === "string" ? parsed.sourceLanguage : "",
          translation: parsed.translation,
        };
      }
    } catch (e) {
      // fall through to returning the raw text
    }
  }
  return { sourceLanguage: "", translation: cleaned };
}
