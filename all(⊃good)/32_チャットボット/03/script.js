const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");

// ********** 重要 **********
const API_KEY = ""; // ここにGemini APIキーを貼り付け
const MODEL_NAME = "gemini-pro"; // 使用するモデル (gemini-pro, gemini-pro-vision など)
// *************************

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;


// メッセージ送信関数
async function sendMessage() {
  const messageText = userInput.value.trim();
  if (messageText === "") {
    return;
  }

  // ユーザーメッセージを表示
  displayMessage(messageText, "user");
  userInput.value = ""; // 入力欄をクリア

  // ローディング表示
  displayLoading();


  // Gemini APIにリクエストを送信
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: messageText }] }],
      }),
    });

    if (!response.ok) {
      // エラーハンドリング (詳細なエラーメッセージを表示)
      const errorData = await response.json();
      displayMessage(`エラー: ${response.status} - ${errorData.error.message}`, "bot");
      removeLoading();
      return;
    }

    const data = await response.json();
    // console.log(data); // レスポンス全体をログ出力(デバッグ用)

    // レスポンスからテキストを取り出す (エラー処理を強化)
    let botResponse = "";
    try {
      botResponse = data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("レスポンスデータの解析エラー:", error);
      botResponse = "エラー: 応答を処理できませんでした。";
    }

    // ボットの応答を表示
    removeLoading(); //ローディング表示を削除
    displayMessage(botResponse, "bot");

  } catch (error) {
    console.error("APIリクエストエラー:", error);
    removeLoading();
    displayMessage("エラー: APIリクエスト中にエラーが発生しました。", "bot");
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// メッセージ表示関数
function displayMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    const messageContent = document.createElement("div"); // テキストを囲む要素
    messageContent.classList.add("message-content"); // スタイル用のクラス
    messageContent.textContent = text;
    messageDiv.appendChild(messageContent);

    chatMessages.appendChild(messageDiv);
}

// ローディング表示関数
function displayLoading() {
  const loadingDiv = document.createElement("div");
  loadingDiv.classList.add("message", "bot-message", "loading");
  loadingDiv.textContent = "考え中..."; // ローディングメッセージ
  chatMessages.appendChild(loadingDiv);
}

// ローディング表示削除関数
function removeLoading() {
  const loadingDiv = document.querySelector(".loading");
  if (loadingDiv) {
    chatMessages.removeChild(loadingDiv);
  }
}

// イベントリスナー
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { // Shift+Enterでの改行を防ぐ
    event.preventDefault(); // デフォルトのEnterキーの動作をキャンセル
    sendMessage();
  }
});
