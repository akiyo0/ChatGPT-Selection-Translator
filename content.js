// Copyright (C) 2026 Akiyo
// SPDX-License-Identifier: GPL-3.0-or-later

(function () {
  const HOST_ID = "chatgpt-translate-host";

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host.shadowRoot;

    host = document.createElement("div");
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 2147483647;
        }
        .card {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          width: 320px;
          max-height: 60vh;
          overflow-y: auto;
          background: #fff;
          color: #1f1f1f;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,.2);
          padding: 14px 16px;
          box-sizing: border-box;
          display: none;
        }
        .card.visible { display: block; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .langs { flex: 1; }
        .close-btn {
          cursor: pointer;
          border: none;
          background: transparent;
          font-size: 16px;
          color: #999;
          line-height: 1;
          padding: 0 0 0 8px;
        }
        .close-btn:hover { color: #333; }
        .original {
          font-size: 12px;
          color: #888;
          margin-bottom: 8px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .translation {
          font-size: 15px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          margin-bottom: 10px;
        }
        .loading { font-size: 13px; color: #666; }
        .error { font-size: 13px; color: #c0392b; }
        .actions { display: flex; justify-content: flex-end; }
        .copy-btn {
          font-size: 12px;
          border: 1px solid #ddd;
          background: #f7f7f7;
          border-radius: 6px;
          padding: 4px 10px;
          cursor: pointer;
          color: #333;
        }
        .copy-btn:hover { background: #eee; }
        @media (prefers-color-scheme: dark) {
          .card { background: #2b2b2b; color: #e8e8e8; }
          .header { color: #aaa; }
          .original { color: #999; }
          .copy-btn { background: #3a3a3c; border-color: #4a4a4c; color: #e8e8e8; }
          .copy-btn:hover { background: #46464a; }
        }
      </style>
      <div class="card">
        <div class="header">
          <span class="langs"></span>
          <button class="close-btn" aria-label="Close">×</button>
        </div>
        <div class="body"></div>
      </div>
    `;

    shadow.querySelector(".close-btn").addEventListener("click", () => hideCard(shadow));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideCard(shadow);
    });
    document.addEventListener(
      "mousedown",
      (e) => {
        if (!host.contains(e.target)) hideCard(shadow);
      },
      true
    );

    return shadow;
  }

  function hideCard(shadow) {
    shadow.querySelector(".card").classList.remove("visible");
  }

  function showCard(shadow) {
    shadow.querySelector(".card").classList.add("visible");
  }

  function renderLoading() {
    const shadow = ensureHost();
    shadow.querySelector(".langs").textContent = "Translating…";
    shadow.querySelector(".body").innerHTML = `<div class="loading">Translating…</div>`;
    showCard(shadow);
  }

  function renderError(message) {
    const shadow = ensureHost();
    shadow.querySelector(".langs").textContent = "";
    shadow.querySelector(".body").innerHTML = `<div class="error"></div>`;
    shadow.querySelector(".error").textContent = message;
    showCard(shadow);
  }

  function renderResult({ original, sourceLanguage, targetLanguage, translation }) {
    const shadow = ensureHost();
    shadow.querySelector(".langs").textContent = sourceLanguage
      ? `Detected: ${sourceLanguage} → ${targetLanguage}`
      : `Translate to ${targetLanguage}`;

    const body = shadow.querySelector(".body");
    body.innerHTML = `
      <div class="original"></div>
      <div class="translation"></div>
      <div class="actions"><button class="copy-btn">Copy translation</button></div>
    `;
    body.querySelector(".original").textContent = original;
    body.querySelector(".translation").textContent = translation;
    body.querySelector(".copy-btn").addEventListener("click", () => {
      navigator.clipboard.writeText(translation).then(() => {
        const btn = body.querySelector(".copy-btn");
        const old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => (btn.textContent = old), 1200);
      });
    });

    showCard(shadow);
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "SHOW_LOADING") renderLoading();
    else if (message.type === "SHOW_TRANSLATION") renderResult(message);
    else if (message.type === "SHOW_ERROR") renderError(message.message);
  });
})();
