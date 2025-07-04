const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const chatMessages = document.getElementById("chat-messages");

// メッセージ送信関数
function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === "") {
        return; // 空メッセージは送信しない
    }

    // ユーザーメッセージを表示
    displayMessage(messageText, "user");

    // ボットの応答 (ここでは固定の応答)
    const botResponse = getBotResponse(messageText); //ボットの応答を生成する関数を呼び出す
    displayMessage(botResponse, "bot");

    userInput.value = ""; // 入力欄をクリア
    chatMessages.scrollTop = chatMessages.scrollHeight; // スクロールを一番下に
}

// メッセージ表示関数
function displayMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
}

// ボットの応答を生成する関数　(簡単な例)
function getBotResponse(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    if (lowerCaseMessage.includes("こんにちは")) {
      return "こんにちは！";
    } else if (lowerCaseMessage.includes("元気？")) {
      return "はい、元気です！";
    } else if (lowerCaseMessage.includes("ありがとう")) {
      return "どういたしまして！";
    }else {
        return "すみません、よくわかりません。";
    }
}

// イベントリスナー
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});