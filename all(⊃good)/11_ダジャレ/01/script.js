document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.getElementById('generate-button');
    const punElement = document.getElementById('pun');
    const imageElement = document.getElementById('random-image');

    const puns = [
        昨日の夜、寝不足で寝ぼけて寝過ごした。,
        このカレー、辛れー！,
        納豆の話は、なっとうも面白い。,
        最近、太りすぎてふとんが吹っ飛んだ。,
        カメラを持ってカメらが僕を撮った。,
        パン屋でパンを買ってパンパンだ。,
        お寿司を握るのは、すし職人のための必須事項。,
        馬がウマい！,
        魚をさかなに酒を飲む。,
        猫が寝込んだ。
    ];

    generateButton.addEventListener('click', function() {
         ランダムなダジャレを選択
        const randomPun = puns[Math.floor(Math.random()  puns.length)];
        punElement.textContent = randomPun;

         ランダムな画像を取得
        fetchRandomImage();
    });

    function fetchRandomImage() {
        const url = httpssource.unsplash.comrandom600x400;
        const timestamp = new Date().getTime();
        imageElement.src = url + 't=' + timestamp;
    }
});