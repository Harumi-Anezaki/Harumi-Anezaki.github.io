"use strict";
$(document).ready(function() {
  // グローバル変数
  let pagesData = {}; // { pageID: { parentID, title, content, updatedAt } }
  let currentPageID = null;
  let undoStack = [];

  /////////////////////////////
  // 初期化処理：ページデータの読み込みとUIの初期設定
  /////////////////////////////
  function init() {
    loadPages();
    bindEvents();
    // currentPageIDが未定義または存在しない場合に新規ページ作成
    if (!currentPageID || !pagesData[currentPageID]) {
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
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== currentContent) {
      undoStack.push(currentContent);
    }
  }

  function undo() {
    if (undoStack.length > 1) {
      undoStack.pop();
      const prevState = undoStack[undoStack.length - 1];
      $("#markdown-input").val(prevState);
      updatePreview();
    }
  }

  /////////////////////////////
  // テキストエリアのライブMarkdownレンダリング
  /////////////////////////////
  function updatePreview() {
    const text = $("#markdown-input").val();
    // markedでMarkdownをHTMLに変換。{ breaks: true }により改行を反映
    const htmlOutput = marked(text, { breaks: true });
    $("#preview").html(htmlOutput);
  }

  /////////////////////////////
  // Markdownテンプレートの挿入（テキストエリアへの挿入）
  /////////////////////////////
  function insertTemplateAtCursor(template) {
    const textarea = document.getElementById("markdown-input");
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos);
    textarea.value = textBefore + template + textAfter;
    updatePreview();
    pushUndoState();
    // カーソル位置をテンプレートの末尾にセット
    textarea.selectionStart = textarea.selectionEnd = startPos + template.length;
    textarea.focus();
  }

  /////////////////////////////
  // イベントバインディング
  /////////////////////////////
  function bindEvents() {
    // エディタ内の入力イベントでライブレンダリング
    $("#markdown-input").on("input", function() {
      updatePreview();
      pushUndoState();
    });

    // 保存ボタン
    $("#save-btn").on("click", function() {
      saveCurrentPage();
    });

    // 取り消しボタン
    $("#undo-btn").on("click", function() {
      undo();
    });

    // サイドバーツリークリックでページ切替
    $("#page-tree").on("click", "li", function() {
      const id = $(this).data("id");
      loadPage(id);
    });

    // サイドバーのフィルター
    $("#sidebar-filter").on("input", function() {
      const filter = $(this).val();
      renderPageTree(filter);
    });

    // グローバル検索
    $("#global-search").on("input", function() {
      const keyword = $(this).val();
      renderPageTree(keyword);
    });

    // 固定の追加ボタンでモーダル表示
    $("#add-page-btn").on("click", function() {
      $("#actionModal").modal("show");
    });

    // モーダル内の「新規ページ作成」ボタン
    $("#create-page-btn").on("click", function() {
      $("#actionModal").modal("hide");
      const title = prompt("新規ページのタイトルを入力してください", "新しいページ");
      if (title) {
        createNewPage(null, title);
        $("#markdown-input").val(""); // 新規ページは空で開始
        updatePreview();
      }
    });

    // モーダル内のMarkdownテンプレート挿入ボタン
    $(".template-btn").on("click", function() {
      $("#actionModal").modal("hide");
      const template = $(this).attr("data-template");
      insertTemplateAtCursor(template);
    });
  }

  // 初期処理実行
  init();
});