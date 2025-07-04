document.addEventListener('DOMContentLoaded', function() {
    const outputElement = document.getElementById('typed-output');
    const inputElement = document.getElementById('command-input');

    const typed = new Typed(outputElement, {
        strings: [
            "Initializing system...",
            "Loading profile...",
            "Welcome, User!",
            "Type 'help' for available commands."
        ],
        typeSpeed: 40,
        backSpeed: 20,
        startDelay: 1000,
        backDelay: 500,
        loop: false, // 最初の一連のメッセージはループしない
        showCursor: false,
        onComplete: (self) => {
             // アニメーション完了後に、入力を受け付けるようにする
             inputElement.focus();
        }
    });

    inputElement.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            const command = inputElement.value.trim().toLowerCase();
            inputElement.value = ''; // 入力欄をクリア

            let response = '';

            switch (command) {
                case 'help':
                    response = "Available commands: 'help', 'about', 'skills', 'contact'";
                    break;
                case 'about':
                    response = "I am a passionate developer with experience in...";
                    break;
                case 'skills':
                    response = "My skills include: JavaScript, Python, HTML, CSS...";
                    break;
                case 'contact':
                    response = "You can reach me at: example@email.com";
                    break;
                default:
                    response = "Unknown command. Type 'help' for available commands.";
            }

             // 以前のTypedインスタンスを破棄（存在する場合）
            if (window.currentTyped) {
                 window.currentTyped.destroy();
            }

            // 新しいTypedインスタンスを作成して応答を表示
           window.currentTyped = new Typed(outputElement, {
                strings: [`> ${command}`, response], // コマンドも表示
                typeSpeed: 40,
                backSpeed: 20,
                startDelay: 500,
                backDelay: 500,
                loop: false,
                showCursor: false, // 最後のコマンドではカーソルを表示しない
                onComplete: (self) => {
                  inputElement.focus();
                }
            });
        }
    });
});