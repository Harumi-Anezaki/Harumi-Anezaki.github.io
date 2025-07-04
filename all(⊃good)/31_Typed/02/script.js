document.addEventListener('DOMContentLoaded', function() {
    const outputElement = document.getElementById('typed-output');
    const inputElement = document.getElementById('command-input');
    let currentTyped = null;

    // 【非常に危険】APIキーをここに直接記述しないでください！
    const geminiApiKey = 'AIzaSyB03GJSLQsPg6wsNkeV5Qcb1nE1ZSwbC84'; // あなたのGemini APIキーに置き換えてください

    // Gemini APIにリクエストを送信する関数
    async function sendMessageToGemini(message) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro-exp-02-05:generateContent?key=${geminiApiKey}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: message }],
                    }],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json(); // エラーの詳細を取得
                throw new Error(`Gemini API error: ${response.status} - ${errorData.error.message}`);
            }
            const data = await response.json();

            // レスポンスの構造が異なる場合があるので、適切に処理する
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length>0) {
              return data.candidates[0].content.parts[0].text;
            } else if (data.promptFeedback) {
                // ブロックされた場合など
                return `Prompt feedback: ${JSON.stringify(data.promptFeedback)}`;
            }
             else {
                return "Error: Could not get a valid response from Gemini.";
            }


        } catch (error) {
            console.error('Error sending message to Gemini:', error);
            return `Error: ${error.message}`;
        }
    }


    // 入力イベントの処理
    inputElement.addEventListener('keydown', async function(event) {
        if (event.key === 'Enter') {
            const userMessage = inputElement.value.trim();
            inputElement.value = '';

            if (!userMessage) return;

            // ユーザーの入力を表示
            if (currentTyped) {
                currentTyped.destroy();
            }
            currentTyped = new Typed(outputElement, {
                strings: [`> ${userMessage}`],
                typeSpeed: 40,
                showCursor: false,
                onComplete: async () => {
                    // Gemini APIにメッセージを送信し、応答を取得
                    const botResponse = await sendMessageToGemini(userMessage);

                    // AIの応答を表示
                    if (currentTyped) {
                        currentTyped.destroy();
                    }
                    currentTyped = new Typed(outputElement, {
                        strings: [botResponse],
                        typeSpeed: 40,
                        startDelay: 500,
                        showCursor: false,
                        onComplete: () => {
                            inputElement.focus();
                        }
                    });
                }
            });
        }
    });

       // 最初のメッセージを表示 (Typed.js)
    function initialPrompt() {
        if (currentTyped) {
            currentTyped.destroy();
        }
        currentTyped = new Typed(outputElement, {
            strings: ["Welcome! Type your message to chat with the AI."],
            typeSpeed: 40,
            showCursor: false,
            onComplete: () => {
                inputElement.focus();
            }
        });
    }

    initialPrompt(); // 初期メッセージを表示

});