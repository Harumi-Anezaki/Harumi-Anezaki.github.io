const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');

let db; // IndexedDB データベースオブジェクト
let songs = [];
let currentSongIndex = 0;
let playbackHistory = []; // 再生履歴

// IndexedDB の初期化
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('musicPlayerDB', 1); // データベースを開く (バージョン1)

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject(event);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      // データベースのバージョンが初めて、または古い場合に実行される
      db = event.target.result;

      // オブジェクトストア (テーブルのようなもの) を作成
      if (!db.objectStoreNames.contains('songs')) {
        const objectStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('name', 'name', { unique: false }); // インデックス作成（任意）
      }
      if (!db.objectStoreNames.contains('playbackHistory')) {
           db.createObjectStore('playbackHistory', { keyPath: 'id', autoIncrement: true });
      }

    };
  });
}

// データの読み込み
function loadData() {
  return new Promise((resolve) => {
    if (!db) {
        resolve();
        return;
    }
    const transaction = db.transaction(['songs', 'playbackHistory'], 'readonly');
    const songStore = transaction.objectStore('songs');
    const historyStore = transaction.objectStore('playbackHistory');

    const getAllSongs = songStore.getAll();
     // 再生履歴の読み込み
    const getHistory = historyStore.getAll();

    getAllSongs.onsuccess = () => {
        songs = getAllSongs.result || []; // 結果を取得（存在しない場合は空配列）
        // リスト項目の再構築
        songs.forEach((song) => {
          const listItem = document.createElement('li');
          listItem.textContent = song.name;
          listItem.dataset.index = song.id; // IndexedDB の ID を使う
          listItem.addEventListener('click', playSelectedSong);
          songList.appendChild(listItem);
        });

        // 再生履歴を読み込み
        getHistory.onsuccess = () => {
                playbackHistory = getHistory.result.map(item => item.index) || []; // indexだけ

                // 最後の曲をロード（履歴があれば）
                if (playbackHistory.length > 0) {
                    currentSongIndex = playbackHistory[playbackHistory.length - 1];
                    loadSong(currentSongIndex);
                }
                resolve();
        };

        getHistory.onerror = (event) => {
            console.error("Error loading playback history:", event);
            resolve(); // 履歴の読み込みに失敗しても続行
        }
    };
    getAllSongs.onerror = () => {
        console.error("Error loading songs", getAllSongs.error);
        resolve();  // データの読み込みに失敗しても処理を続ける
    }
  });
}

// データの保存（曲）
function saveSongs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['songs'], 'readwrite');
        const objectStore = transaction.objectStore('songs');
        objectStore.clear(); // 既存のデータをすべて削除

        songs.forEach((song) => {
          const request = objectStore.add(song); // Fileオブジェクトごと保存
          request.onsuccess = () => { /* 成功時の処理 */ };
          request.onerror = (event) => console.error("Error saving song:", event);
        });

        transaction.oncomplete = () => {
            resolve(); // すべての保存処理が完了したらresolve
        };
        transaction.onerror = (event) => {
            console.error("Transaction error:", event);
            reject(event);
        };
    });
}
// データの保存（履歴）
function savePlaybackHistory() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['playbackHistory'], 'readwrite');
        const objectStore = transaction.objectStore('playbackHistory');

        objectStore.clear(); // 既存の履歴をクリア

        // 履歴を保存 (インデックスのみ)
        playbackHistory.forEach(index => {
            objectStore.add({ index });
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject();
    });
}


//フォルダ選択時
folderInput.addEventListener('change', async (event) => {
  songs = [];
  songList.innerHTML = '';
  currentSongIndex = 0;
  playbackHistory = []; // 履歴をリセット

  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('audio/')) {
      songs.push(file); // Fileオブジェクトをそのまま追加
      const listItem = document.createElement('li');
      listItem.textContent = file.name;
      listItem.dataset.index = i; //仮のindex
      listItem.addEventListener('click', playSelectedSong);
      songList.appendChild(listItem);
    }
  }

  if (songs.length > 0) {
        // loadSong(currentSongIndex); //IndexedDB管理になったので､ここでは呼ばない
  }
    await saveSongs(); //変更を保存
    await loadData();   //リストをリフレッシュ
});

//loadSong関数
async function loadSong(index, addToHistory = true) {

  if (!db || index === null || index === undefined) { // dbがない or indexがおかしい
      return;
  }

    //songsからではなく, IndexedDBから取得
    return new Promise((resolve) => {
        const transaction = db.transaction(['songs'], 'readonly');
        const objectStore = transaction.objectStore('songs');
        const request = objectStore.get(index);

        request.onsuccess = async () => {
            const song = request.result;
            if (!song) {
                console.error("Song not found with index:", index);
                resolve(); // 曲が見つからなくても処理を続ける
                return;
            }

             // 現在の曲を履歴に追加（履歴の最後と異なる場合のみ）
            if (addToHistory && playbackHistory[playbackHistory.length - 1] !== index) {
                    playbackHistory.push(index);
                    await savePlaybackHistory(); //履歴を保存
            }

            currentSongIndex = index;

            const url = URL.createObjectURL(song); // File オブジェクトから URL を作成
            audioPlayer.src = url;
            currentSongTitleDisplay.textContent = song.name;
            audioPlayer.load();
            updatePlayPauseButton();
            highlightCurrentSong();
            resolve();
        };
        request.onerror = () => {
            console.error("Error loading song from DB", request.error);
            resolve(); // エラーが起きても処理を続ける
        }

    });
}

//曲選択
async function playSelectedSong(event) {
    const index = parseInt(event.target.dataset.index);
    await loadSong(index); //変更を待つ
    play();
}

// play 関数: audioPlayer の状態変更のみ
function play() {
  audioPlayer.play();
  updatePlayPauseButton(); // ボタン更新
}

// pause 関数: audioPlayer の状態変更のみ
function pause() {
  audioPlayer.pause();
  updatePlayPauseButton(); // ボタン更新
}

// ボタンの表示を更新する関数 (audioPlayer の状態に基づいて)
function updatePlayPauseButton() {
  if (audioPlayer.paused) {
    playPauseButton.textContent = '再生';
  } else {
    playPauseButton.textContent = '一時停止';
  }
}

playPauseButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  if (audioPlayer.paused) {
    play();
  } else {
    pause();
  }
});

// prevButton: 履歴を使う
prevButton.addEventListener('click', async () => {
    if (playbackHistory.length <= 1) {
      return; //最初の曲 or 履歴がない
    }
    playbackHistory.pop(); // 最後の要素を削除
    const previousIndex = playbackHistory[playbackHistory.length - 1]; //削除した後に取得
    await loadSong(previousIndex);
    play();

});

nextButton.addEventListener('click', async () => {
    if (!db) return;

    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const countRequest = objectStore.count(); // 曲数をカウント

    countRequest.onsuccess = async () => {
        const songCount = countRequest.result;
        if (songCount === 0) return; //曲がない

        // ランダムなインデックスを生成
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songCount) + 1; // 1から始まる連番
        } while (randomIndex === currentSongIndex); // 現在の曲とは異なる

        await loadSong(randomIndex);
        play();
    };
});

audioPlayer.addEventListener('ended', async () => { //ランダム再生
    if (!db) return;

    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const countRequest = objectStore.count(); // 曲数をカウント

    countRequest.onsuccess = async () => {
        const songCount = countRequest.result;
        if (songCount === 0) return;// 曲がない

        // ランダムなインデックスを生成
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * songCount) + 1; // 1から始まる連番
        } while (randomIndex === currentSongIndex); // 現在の曲とは異なる

        await loadSong(randomIndex);
        play();
    };
});

function highlightCurrentSong() {
  const listItems = songList.querySelectorAll('li');
  listItems.forEach((li) => {
    li.style.backgroundColor = '';
  });

  if (listItems[currentSongIndex -1 ]) {
    listItems[currentSongIndex - 1].style.backgroundColor = '#e0e0e0'; // 0から始まるインデックスに戻す
  }
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowRight') {
    nextButton.click();
  } else if (event.key === ' ') {
    playPauseButton.click();
    event.preventDefault();
  } else if (event.code === 'ArrowLeft') {
    prevButton.click();
  }
});

// ページ読み込み時にDBを初期化し、データをロード
initDB().then(() => {
    loadData().then(() => {
        updatePlayPauseButton();
    });
});