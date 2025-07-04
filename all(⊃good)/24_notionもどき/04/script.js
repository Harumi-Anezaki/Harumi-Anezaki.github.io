"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("markdown-input");
  const preview = document.getElementById("preview");

  // 初期レンダリング
  renderMarkdown();

  textarea.addEventListener("input", renderMarkdown);

  function renderMarkdown() {
    const text = textarea.value;

    // シンプルなMarkdownパーサーの実装
    let html = text
      // 見出しの変換: #～###### を <h1>～<h6> に
      .replace(/^(#{1,6})\s*(.*)/gm, (match, hashes, title) => {
        const level = hashes.length;
        return `<h${level}>${title.trim()}</h${level}>`;
      })
      // 太字の変換: **text**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // イタリックの変換: *text*
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // コードの変換: `code`
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      // 改行の変換
      .replace(/\n+/g, "<br>");

    preview.innerHTML = html;
  }
});