// YouTube APIキー (各自で取得)
const API_KEY = 'YOUR_YOUTUBE_API_KEY';

// 動画IDのリスト (サンプル)
const videoIds = [
  'dQw4w9WgXcQ', // 例1
  '6NXnxTNIWkc', // 例2
  'y6120QOlsfU', // 例3
];

let mainPlayer;
let overlayPlayer;
let currentMainVideoIndex = 0;

// YouTube IFrame Player APIの読み込み完了後に実行
function onYouTubeIframeAPIReady() {
  createPlayers();
  loadVideoList();
}

// プレイヤーの作成
function createPlayers() {
  mainPlayer = new YT.Player('main-player', {
    videoId: videoIds[currentMainVideoIndex],
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });

  overlayPlayer = new YT.Player('overlay-player', {
    videoId: '', // 最初は空
    playerVars: {
      controls: 0, // コントロール非表示
      disablekb: 1, //キーボード操作無効
      showinfo: 0, //動画情報を非表示
      rel: 0, //関連動画を非表示
    },
    events: {
      'onReady': onOverlayPlayerReady,
       'onStateChange': onOverlayPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
    //event.target.playVideo(); //自動再生はしない
}
function onOverlayPlayerReady(event) {
    //event.target.playVideo(); //自動再生はしない
}

function onPlayerStateChange(event) {
  // メインプレイヤーの状態変化時の処理（必要に応じて）
}

function onOverlayPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // オーバーレイ動画が終了したら非表示にする
        hideOverlay();
    }
}


// 動画リストの読み込み
function loadVideoList() {
  const videoListDiv = document.getElementById('video-list');
  videoIds.forEach((videoId, index) => {
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.classList.add('thumbnail');
    img.addEventListener('click', () => playVideo(index));
    videoListDiv.appendChild(img);
  });
}

// サムネイルクリック時の処理
function playVideo(index) {
  currentMainVideoIndex = index;
  mainPlayer.loadVideoById(videoIds[index]);
}

// オーバーレイ表示
function showOverlay(videoId, startTime, duration) {
  overlayPlayer.loadVideoById({
    videoId: videoId,
    startSeconds: startTime,
    // endSeconds: startTime + duration,  // durationは使わず、ENDEDイベントで制御
  });
  overlayPlayer.setVolume(0); // 必要に応じて音量を調整
  document.getElementById('overlay-player').style.opacity = 0.7; // 透明度を設定
  overlayPlayer.playVideo();
}

// オーバーレイ非表示
function hideOverlay() {
  document.getElementById('overlay-player').style.opacity = 0;
  overlayPlayer.stopVideo();
}


// エフェクトボタンのイベントリスナー
document.getElementById('slow-motion').addEventListener('click', () => {
  mainPlayer.setPlaybackRate(0.5); // 半分の速度
});

document.getElementById('repeat').addEventListener('click', () => {
    mainPlayer.seekTo(0); //動画の最初に戻す
    mainPlayer.playVideo();
});

document.getElementById('grayscale').addEventListener('click', () => {
  document.getElementById('main-player').classList.add('grayscale');
});

document.getElementById('sepia').addEventListener('click', () => {
  document.getElementById('main-player').classList.add('sepia');
});

document.getElementById('reset-effects').addEventListener('click', () => {
    mainPlayer.setPlaybackRate(1);
    document.getElementById('main-player').classList.remove('grayscale', 'sepia');
});



// オーバーレイ表示のテスト (例: 5秒後に2番目の動画の10秒から5秒間をオーバーレイ)
setTimeout(() => {
  showOverlay(videoIds[1], 10, 5);
}, 5000);