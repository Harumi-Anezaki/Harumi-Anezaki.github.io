document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.getElementById('generate-button');
    const addPunButton = document.getElementById('add-pun-button');
    const punElement = document.getElementById('pun');
    const imageElement = document.getElementById('random-image');
    const punCountElement = document.getElementById('pun-count');
    const categorySelect = document.getElementById('category-select');
    const shareTwitterButton = document.getElementById('share-twitter');
    const speakButton = document.getElementById('speak-button');

    const modal = document.getElementById('modal');
    const closeButton = document.querySelector('.close-button');
    const savePunButton = document.getElementById('save-pun-button');
    const newPunInput = document.getElementById('new-pun-input');

    let punCount = 0;

    let puns = [
        { text: "昨日の夜、寝不足で寝ぼけて寝過ごした。", category: "misc" },
        { text: "このカレー、辛れー！", category: "food" },
        { text: "納豆の話は、なっとうも面白い。", category: "food" },
        { text: "最近、太りすぎてふとんが吹っ飛んだ。", category: "misc" },
        { text: "カメラを持ってカメらが僕を撮った。", category: "misc" },
        { text: "パン屋でパンを買ってパンパンだ。", category: "food" },
        { text: "お寿司を握るのは、すし職人のための必須事項。", category: "food" },
        { text: "馬がウマい！", category: "animals" },
        { text: "魚をさかなに酒を飲む。", category: "food" },
        { text: "猫が寝込んだ。", category: "animals" }
    ];

    generateButton.addEventListener('click', function() {
        // 選択されたカテゴリーを取得
        const selectedCategory = categorySelect.value;
        
        // 選択されたカテゴリーのダジャレをフィルタリング
        let filteredPuns = puns;
        if (selectedCategory !== 'all') {
            filteredPuns = puns.filter(pun => pun.category === selectedCategory);
            if (filteredPuns.length === 0) {
                alert('選択したカテゴリーにはダジャレがありません。');
                return;
            }
        }

        // ランダムなダジャレを選択
        const randomPun = filteredPuns[Math.floor(Math.random() * filteredPuns.length)].text;
        punElement.textContent = randomPun;

        // ダジャレ生成回数を更新
        punCount++;
        punCountElement.textContent = punCount;

        // ランダムな画像を取得
        fetchRandomImage();

        // シェアボタンを更新
        updateShareButton(randomPun);
    });

    function fetchRandomImage() {
        const API_KEY = 'YOUR_PIXABAY_API_KEY'; // ※ご自身のAPIキーに置き換えてください
        const url = `https://pixabay.com/api/?key=${API_KEY}&q=funny&lang=ja&image_type=photo&per_page=200`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.hits && data.hits.length > 0) {
                    const randomImage = data.hits[Math.floor(Math.random() * data.hits.length)].webformatURL;
                    imageElement.src = randomImage;
                } else {
                    imageElement.src = '';
                    console.error('Pixabay APIから画像が見つかりませんでした。');
                }
            })
            .catch(error => {
                imageElement.src = '';
                console.error('Pixabay APIから画像を取得中にエラーが発生しました:', error);
            });
    }

    addPunButton.addEventListener('click', function() {
        openModal();
    });

    closeButton.addEventListener('click', function() {
        closeModal();
    });

    savePunButton.addEventListener('click', function() {
        const newPunText = newPunInput.value.trim();
        if (newPunText === '') {
            alert('ダジャレを入力してください。');
            return;
        }
        // 仮にカテゴリーを "misc" として追加
        puns.push({ text: newPunText, category: 'misc' });
        newPunInput.value = '';
        closeModal();
        alert('ダジャレが追加されました！');
    });

    function openModal() {
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // モーダル外部をクリックした際に閉じる
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }

    function updateShareButton(punText) {
        const twitterURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(punText)}&hashtags=ダジャレ生成アプリ`;
        shareTwitterButton.onclick = function() {
            window.open(twitterURL, '_blank');
        };
    }

    // ダジャレ読み上げ機能
    speakButton.addEventListener('click', function() {
        const punText = punElement.textContent;
        if (punText === '') {
            alert('先にダジャレを生成してください。');
            return;
        }
        const utterance = new SpeechSynthesisUtterance(punText);
        utterance.lang = 'ja-JP';
        window.speechSynthesis.speak(utterance);
    });

});