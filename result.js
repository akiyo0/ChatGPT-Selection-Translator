// Copyright (C) 2026 Akiyo
// SPDX-License-Identifier: GPL-3.0-or-later

function getParam(name) {
  return new URL(location.href).searchParams.get(name);
}

async function init() {
  const id = getParam("id");
  const bodyEl = document.getElementById("body");
  const langsEl = document.getElementById("langs");

  if (!id) {
    bodyEl.innerHTML = '<div class="error">Missing translation data.</div>';
    return;
  }

  const stored = await chrome.storage.session.get(id);
  const payload = stored[id];

  if (!payload) {
    bodyEl.innerHTML = '<div class="error">Translation data has expired. Please translate again.</div>';
    return;
  }

  if (payload.type === "SHOW_ERROR") {
    bodyEl.innerHTML = '<div class="error"></div>';
    bodyEl.querySelector(".error").textContent = payload.message;
  } else if (payload.type === "SHOW_TRANSLATION") {
    langsEl.textContent = payload.sourceLanguage
      ? `Detected: ${payload.sourceLanguage} → ${payload.targetLanguage}`
      : `Translate to ${payload.targetLanguage}`;

    bodyEl.innerHTML = `
      <div class="original"></div>
      <div class="translation"></div>
      <div class="actions"><button id="copyBtn">Copy translation</button></div>
    `;
    bodyEl.querySelector(".original").textContent = payload.original;
    bodyEl.querySelector(".translation").textContent = payload.translation;
    bodyEl.querySelector("#copyBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(payload.translation).then(() => {
        const btn = document.getElementById("copyBtn");
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = old), 1200);
      });
    });
  }

  chrome.storage.session.remove(id);
}

init();
