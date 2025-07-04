// 地図の初期化
const map = L.map('map').setView([35.6895, 139.6917], 13); // 初期位置: 東京

// 現在の地図 (OpenStreetMap)
const currentMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 過去の地図 (例: 国土地理院の空中写真 - 1970年代)
// 実際には、適切なタイルサーバーのURLを指定する必要があります
const oldMap = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png', {
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>',
    maxNativeZoom: 18, // 最大ズームレベル (元データの解像度による)
    maxZoom: 20      // 表示上の最大ズームレベル
});


// スライダーのイベントリスナー
const opacitySlider = document.getElementById('opacity-slider');
opacitySlider.addEventListener('input', function() {
    oldMap.setOpacity(1 - this.value);  // スライダーの値に応じて不透明度を変更
    currentMap.setOpacity(this.value); // 現在の地図のopacityも調整. スライダーmax=1の時、現在の地図のopacity=1
});


// 初期状態では過去の地図を非表示にする (opacity=0)
oldMap.setOpacity(0);
oldMap.addTo(map);
currentMap.addTo(map);

// ベースマップの切り替えコントロールは削除. 今回はopacityで制御するため.