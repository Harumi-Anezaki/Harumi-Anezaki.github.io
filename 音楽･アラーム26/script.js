const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');

// アラーム関連の要素
const alarmTimeInput = document.getElementById('alarmTime');
const setAlarmButton = document.getElementById('setAlarmButton');
const clearAlarmButton = document.getElementById('clearAlarmButton'); // アラーム解除ボタン

let db;
let songs = [];
let currentSongIndex = 0;
let playbackHistory = [];
let alarmIntervalId = null; // アラームの setInterval の ID を保持


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


//フォルダ選択時　(変更)
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

    await saveSongs(); //変更を保存
    await loadData();   //リストをリフレッシュ
});



//loadSong関数 (変更なし)
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


//曲選択 (変更なし)
async function playSelectedSong(event) {
    const index = parseInt(event.target.dataset.index);
    await loadSong(index); //変更を待つ
    play();
}

// play 関数: audioPlayer の状態変更のみ (変更なし)
function play() {
  audioPlayer.play();
  updatePlayPauseButton(); // ボタン更新
}

// pause 関数: audioPlayer の状態変更のみ (変更なし)
function pause() {
  audioPlayer.pause();
  updatePlayPauseButton(); // ボタン更新
}

// ボタンの表示を更新する関数 (audioPlayer の状態に基づいて) (変更なし)
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

// prevButton: 履歴を使う (変更なし)
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

audioPlayer.addEventListener('ended', async () => { //ランダム再生 (変更なし)
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

    if(currentSongIndex > 0){ //currentSongIndexが正しく設定されている時のみ
        if (listItems[currentSongIndex -1 ]) {
            listItems[currentSongIndex - 1].style.backgroundColor = '#e0e0e0'; // 0から始まるインデックスに戻す
        }
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


// --- アラーム関連の関数 ---

// アラームをセット
function setAlarm() {
    const alarmTimeString = alarmTimeInput.value;
    if (!alarmTimeString) {
        console.warn("アラーム時刻が設定されていません。");
        currentSongTitleDisplay.textContent = "アラーム時刻が設定されていません";
        return;
    }

    const [hours, minutes] = alarmTimeString.split(':');
    const now = new Date();
    const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

    if (alarmTime <= now) {
        console.warn("過去の時刻は設定できません。");
        currentSongTitleDisplay.textContent = "過去の時刻は設定できません";
        return;
    }

    localStorage.setItem('alarmTime', alarmTime.toISOString()); // ISO 8601 形式で保存
    console.log(`アラームを設定しました: ${alarmTime}`);
    currentSongTitleDisplay.textContent = `アラームを設定: ${alarmTimeString}`;
    startAlarmInterval();

    // アラーム設定ボタンを非表示にし、アラーム解除ボタンを表示
    setAlarmButton.style.display = 'none';
    clearAlarmButton.style.display = 'inline-block';
}

// アラームインターバルを開始
function startAlarmInterval() {
    if (alarmIntervalId) {
        clearInterval(alarmIntervalId); // 既存のインターバルをクリア
    }

    alarmIntervalId = setInterval(() => {
        const now = new Date();
        const alarmTime = new Date(localStorage.getItem('alarmTime'));

        if (now >= alarmTime) {
            playAlarm();
            clearAlarm(); // アラームをクリア (1回のみ)
        }
    }, 1000); // 1秒ごとにチェック
}

// アラームを再生
async function playAlarm() {
    if (!db) return;

    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const countRequest = objectStore.count();

    countRequest.onsuccess = async () => {
        const songCount = countRequest.result;
        if (songCount === 0) {
            console.warn("再生する曲がありません。");
            currentSongTitleDisplay.textContent = "再生する曲がありません";
            return;
        }

        // 最初の曲を再生 (またはランダム)
        const firstSongIndex = 1;
        await loadSong(firstSongIndex, false); // 再生履歴には追加しない
        play();
        console.log("アラームが鳴りました！");
        currentSongTitleDisplay.textContent = "アラーム！" + currentSongTitleDisplay.textContent;
    };
}

// アラームをクリア
function clearAlarm() {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
    localStorage.removeItem('alarmTime');
    alarmTimeInput.value = '';
    console.log("アラームを解除しました。");
    currentSongTitleDisplay.textContent = "アラームを解除しました";

    // アラーム解除ボタンを非表示にし、アラーム設定ボタンを表示
    clearAlarmButton.style.display = 'none';
    setAlarmButton.style.display = 'inline-block';
}

// --- イベントリスナー ---
setAlarmButton.addEventListener('click', setAlarm);
clearAlarmButton.addEventListener('click', clearAlarm); // アラーム解除ボタンのイベントリスナー


// ページ読み込み時にDBを初期化し、データをロード (変更あり)
initDB().then(() => {
    loadData().then(() => {
        updatePlayPauseButton();

        // 保存されたアラーム時刻があれば、インターバルを開始
        if (localStorage.getItem('alarmTime')) {
            startAlarmInterval();
             // アラーム設定ボタンを非表示にし、アラーム解除ボタンを表示
            setAlarmButton.style.display = 'none';
            clearAlarmButton.style.display = 'inline-block';
        }
    });
});