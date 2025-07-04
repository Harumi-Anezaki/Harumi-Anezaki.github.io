"use strict";
$(document).ready(function() {
  // グローバル変数
  let pagesData = {};   // { pageID: { parentID, title, content, updatedAt } }
  let currentPageID = null;
  let undoStack = [];

  /////////////////////////////
  // 初期化処理：ページデータの読み込みとUIの初期設定
  /////////////////////////////
  function init() {
    loadPages();
    bindEvents();
    // 初期ページ作成（無い場合）
    if (!currentPageID) {
      createNewPage(null, "新規ページ");
    } else {
      loadPage(currentPageID);
    }
  }

  /////////////////////////////
  // ページデータ管理
  /////////////////////////////
  function loadPages() {
    const stored = localStorage.getItem("pagesData");
    if (stored) {
      pagesData = JSON.parse(stored);
      // 任意：currentPageIDもlocalStorageから復元
      currentPageID = localStorage.getItem("currentPageID");
    }
    renderPageTree();
  }

  function savePages() {
    localStorage.setItem("pagesData", JSON.stringify(pagesData));
    if (currentPageID)
      localStorage.setItem("currentPageID", currentPageID);
  }

  /////////////////////////////
  // サイドバーツリー描画
  /////////////////////////////
  function renderPageTree(filterText = "") {
    const $tree = $("#page-tree");
    $tree.empty();
    $.each(pagesData, function(id, page) {
      // フィルタ処理
      if (filterText && page.title.toLowerCase().indexOf(filterText.toLowerCase()) === -1) {
        return;
      }
      const $li = $("<li></li>").text(page.title).attr("data-id", id);
      if (id === currentPageID) $li.addClass("active");
      $tree.append($li);
    });
  }

  /////////////////////////////
  // ページ操作
  /////////////////////////////
  function createNewPage(parentID, title) {
    const pageID = "page-" + new Date().getTime();
    pagesData[pageID] = {
      parentID: parentID,
      title: title,
      content: "",
      updatedAt: new Date().toISOString()
    };
    currentPageID = pageID;
    savePages();
    renderPageTree();
    loadPage(pageID);
  }

  function loadPage(pageID) {
    currentPageID = pageID;
    const page = pagesData[pageID];
    if (page) {
      $("#markdown-input").val(page.content);
      updatePreview();
      renderPageTree();
      // 初期状態としてundoStackをリセット
      undoStack = [];
      pushUndoState();
    }
  }

  function saveCurrentPage() {
    if (currentPageID && pagesData[currentPageID]) {
      pagesData[currentPageID].content = $("#markdown-input").val();
      pagesData[currentPageID].updatedAt = new Date().toISOString();
      savePages();
      renderPageTree();
      // ユーザーに保存完了を示す（簡易アラート）
      $("#save-btn").text("保存済").delay(1000).queue(function(next){
         $(this).text("保存");
         next();
      });
    }
  }

  /////////////////////////////
  // Undo/Redo 用の履歴管理
  /////////////////////////////
  function pushUndoState() {
    const currentContent = $("#markdown-input").val();
    // 重複や空の場合は追加しない
    if (undoStack.length === 0 || undoStack[undoStack.length -1] !== currentContent) {
      undoStack.push(currentContent);
    }
  }

  function undo() {
    if (undoStack.length > 1) {
      undoStack.pop(); // 現在の状態を削除
      const prevState = undoStack[undoStack.length - 1];
      $("#markdown-input").val(prevState);
      updatePreview();
    }
  }

  /////////////////////////////
  // Markdown変換：自動＆手動
  /////////////////////////////
  function updatePreview() {
    const markdownText = $("#markdown-input").val();
    const html = marked(markdownText);
    $("#preview").html(html);
  }

  /////////////////////////////
  // 選択テキスト装飾オーバーレイ
  /////////////////////////////
  function showTextOverlay() {
    const textarea = document.getElementById("markdown-input");
    const selection = window.getSelection();
    // 現在の選択がtextarea内かどうかをチェック
    if (document.activeElement !== textarea) {
      $("#text-overlay").hide();
      return;
    }
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    if (!selectedText) {
      $("#text-overlay").hide();
      return;
    }
    // 仮の位置設定：textarea内の先頭から相対的に表示（実際は計算が必要）
    const overlay = $("#text-overlay");
    overlay.css({ top: "20px", left: "20px" });
    overlay.show();
  }

  function applyDecoration(decoration) {
    const textarea = document.getElementById("markdown-input");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    // 装飾用記法を付与
    const decorated = decoration + selectedText + decoration;
    textarea.value = text.substring(0, start) + decorated + text.substring(end);
    updatePreview();
    // 隠す
    $("#text-overlay").hide();
    // 再設定のためundo履歴更新
    pushUndoState();
  }

  /////////////////////////////
  // イベントバインディング
  /////////////////////////////
  function bindEvents() {
    // エディタ入力：リアルタイム変換 + undo履歴更新（デバウンス可）
    $("#markdown-input").on("input", function() {
      updatePreview();
      pushUndoState();
    });

    // 明示的なMarkdown変換ボタン（任意）
    $("#convert-btn").on("click", function() {
      updatePreview();
    });

    // 保存処理
    $("#save-btn").on("click", function() {
      saveCurrentPage();
    });

    // 取り消し処理
    $("#undo-btn").on("click", function() {
      undo();
    });

    // サイドバーツリークリック：ページ切替
    $("#page-tree").on("click", "li", function() {
      const id = $(this).data("id");
      loadPage(id);
    });

    // サイドバーのフィルター
    $("#sidebar-filter").on("input", function() {
      const filter = $(this).val();
      renderPageTree(filter);
    });

    // 検索バー：グローバル検索（シンプル実装）
    $("#global-search").on("input", function() {
      const keyword = $(this).val();
      renderPageTree(keyword);
    });

    // テキスト選択でオーバーレイ表示
    $("#markdown-input").on("mouseup", function(e) {
      setTimeout(showTextOverlay, 50);
    });

    // 装飾オーバーレイボタン押下
    $("#text-overlay").on("click", ".overlay-btn", function() {
      const decoration = $(this).attr("data-md");
      applyDecoration(decoration);
    });

    // 固定の追加ボタンクリック：新規ページ作成のためのモーダル（簡易版）
    $("#add-page-btn").on("click", function() {
      const title = prompt("新規ページのタイトルを入力してください", "新しいページ");
      if (title) {
        createNewPage(null, title);
      }
    });
  }

  // 初期処理実行
  init();
});