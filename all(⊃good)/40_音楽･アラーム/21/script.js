const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');
const alarmTimeInput = document.getElementById('alarmTime');
const toggleAlarmButton = document.getElementById('toggleAlarm');
const alarmStatusDisplay = document.getElementById('alarmStatus');


let db;
let songs = [];
let currentSongIndex = 0;
let playbackHistory = [];
let alarmTime = null; // アラーム時刻 (例: "10:30")
let alarmIntervalId = null; // setInterval の ID
let isAlarmActive = false; // アラームが有効かどうか


function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('musicPlayerDB', 1);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject(event);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        const objectStore = db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('playbackHistory')) {
        db.createObjectStore('playbackHistory', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

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
    const getHistory = historyStore.getAll();

    getAllSongs.onsuccess = () => {
      songs = getAllSongs.result || [];
      songList.innerHTML = '';
      songs.forEach((song) => {
        const listItem = document.createElement('li');
        listItem.textContent = song.name;
        listItem.dataset.index = song.id;
        listItem.addEventListener('click', playSelectedSong);
        songList.appendChild(listItem);
      });

      getHistory.onsuccess = () => {
        playbackHistory = getHistory.result.map(item => item.index) || [];

        if (playbackHistory.length > 0) {
          currentSongIndex = playbackHistory[playbackHistory.length - 1];
        } else if (songs.length > 0) {
          currentSongIndex = songs[0].id;
        }
        if (songs.length > 0) {
          loadSong(currentSongIndex, false).then(() => {
            resolve();
          });
          return;
        }
        resolve();
      };

      getHistory.onerror = (event) => {
        console.error("Error loading playback history:", event);
        resolve();
      };
    };
    getAllSongs.onerror = () => {
      console.error("Error loading songs", getAllSongs.error);
      resolve();
    };
  });
}

function saveSongs() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['songs'], 'readwrite');
    const objectStore = transaction.objectStore('songs');
    objectStore.clear();

    songs.forEach((song) => {
      const request = objectStore.add(song);
      request.onsuccess = () => { };
      request.onerror = (event) => console.error("Error saving song:", event);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event);
  });
}

function savePlaybackHistory() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['playbackHistory'], 'readwrite');
    const objectStore = transaction.objectStore('playbackHistory');
    objectStore.clear();
    playbackHistory.forEach(index => {
      objectStore.add({ index });
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(event);
  });
}

//フォルダ選択時
folderInput.addEventListener('change', async (event) => {
  songs = [];
  songList.innerHTML = '';
  currentSongIndex = 0;
  playbackHistory = [];

  const files = event.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('audio/')) {
      songs.push(file);
      const listItem = document.createElement('li');
      listItem.textContent = file.name;
      listItem.dataset.index = i;
      listItem.addEventListener('click', playSelectedSong);
      songList.appendChild(listItem);
    }
  }

  await saveSongs();
  await loadData();
});

//loadSong関数
async function loadSong(index, addToHistory = true) {
  if (!db || index === null || index === undefined) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const request = objectStore.get(index);

    request.onsuccess = () => {
      const song = request.result;
      if (!song) {
        console.error("Song not found with index:", index);
        resolve();
        return;
      }

      const url = URL.createObjectURL(song);
      audioPlayer.src = url;
      currentSongTitleDisplay.textContent = song.name;
      audioPlayer.load();

      currentSongIndex = index;
      if (addToHistory && playbackHistory[playbackHistory.length - 1] !== index) {
        playbackHistory.push(index);
        savePlaybackHistory().then(resolve);
        return;
      }
      resolve();

    };

    request.onerror = () => {
      console.error("Error loading song from DB", request.error);
      resolve();
    };
  });
}

//曲選択
async function playSelectedSong(event) {
  const index = parseInt(event.target.dataset.index);
  await loadSong(index);
  play();
}

function play() {
  audioPlayer.play();
  updatePlayPauseButton();
}

function pause() {
  audioPlayer.pause();
  updatePlayPauseButton();
}

function updatePlayPauseButton() {
  if (audioPlayer.paused) {
    playPauseButton.textContent = '再生';
  } else {
    playPauseButton.textContent = '一時停止';
  }
}

// アラーム設定
function setAlarm() {
  alarmTime = alarmTimeInput.value; // 例: "10:30"
  if (alarmTime) {
    localStorage.setItem('alarmTime', alarmTime);
    localStorage.setItem('isAlarmActive', isAlarmActive.toString()); // 文字列で保存
    startAlarmCheck();
    updateAlarmStatus();
  }
}

// アラームクリア
function clearAlarm() {
  alarmTime = null;
  localStorage.removeItem('alarmTime');
  localStorage.removeItem('isAlarmActive');
  stopAlarmCheck();
  alarmTimeInput.value = ''; // input 要素もクリア
  updateAlarmStatus();
}

// アラームのオン/オフ切り替え
function toggleAlarm() {
    isAlarmActive = !isAlarmActive; // 真偽値を反転
    if (isAlarmActive) {
        setAlarm(); // ONにした場合は、時刻設定とチェック開始
    } else {
        clearAlarm(); // OFFにした場合はクリア
    }
}

// アラーム状態の表示を更新
function updateAlarmStatus() {
    if (isAlarmActive && alarmTime) {
        alarmStatusDisplay.textContent = `アラーム設定: ${alarmTime} (ON)`;
    } else {
        alarmStatusDisplay.textContent = "アラーム OFF";
    }
}

// アラームチェック開始
function startAlarmCheck() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId); // 既存の interval があればクリア
  }
  alarmIntervalId = setInterval(checkAlarm, 1000); // 1秒ごとにチェック
}

// アラームチェック停止
function stopAlarmCheck() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

// アラームチェック
function checkAlarm() {
  if (!alarmTime || !isAlarmActive) {
    return;
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (currentTime === alarmTime) {
    if(songs.length > 0){ //曲があるか確認
        play(); // 音楽再生
    }
    clearAlarm(); // アラームをクリア (1回再生したら止まる)
  }
}

// localStorage からアラームを読み込む
function loadAlarm() {
  const savedAlarmTime = localStorage.getItem('alarmTime');
  const savedAlarmActive = localStorage.getItem('isAlarmActive');

  if (savedAlarmTime) {
    alarmTime = savedAlarmTime;
    alarmTimeInput.value = alarmTime; // input 要素に反映
    isAlarmActive = savedAlarmActive === 'true'; // 文字列を真偽値に
    if (isAlarmActive) {
        startAlarmCheck(); // アラームが有効ならチェック開始
    }
    updateAlarmStatus();
  }
}

// イベントリスナーの登録をDOMContentLoadedイベント内、またはinitDB完了後に移動
document.addEventListener('DOMContentLoaded', () => {
  playPauseButton.addEventListener('click', () => {
    if (songs.length === 0) return;
    if (audioPlayer.paused) {
      play();
    } else {
      pause();
    }
  });

  prevButton.addEventListener('click', async () => {
    if (playbackHistory.length <= 1) {
      return;
    }
    playbackHistory.pop();
    const previousIndex = playbackHistory[playbackHistory.length - 1];
    await loadSong(previousIndex);
    play();
  });

  nextButton.addEventListener('click', async () => {
    if (!db) return;

    const transaction = db.transaction(['songs'], 'readonly');
    const objectStore = transaction.objectStore('songs');
    const countRequest = objectStore.count();

    countRequest.onsuccess = async () => {
      const songCount = countRequest.result;
      if (songCount === 0) return;

      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * songCount) + 1;
      } while (randomIndex === currentSongIndex);

      await loadSong(randomIndex);
      play();
    };
  });

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

  // アラーム関連のイベントリスナー
  alarmTimeInput.addEventListener('change', setAlarm);
  toggleAlarmButton.addEventListener('click', toggleAlarm);

  // 保存されたアラームの読み込み
  loadAlarm();
});

// audioPlayer.onloadeddata の登録 (一度だけ)
audioPlayer.onloadeddata = () => {
    updatePlayPauseButton();
    highlightCurrentSong();
};

function highlightCurrentSong() {
  const listItems = songList.querySelectorAll('li');
  listItems.forEach((li) => {
    li.style.backgroundColor = '';
  });

  const currentItem = songList.querySelector(`[data-index="${currentSongIndex}"]`);
  if (currentItem) {
    currentItem.style.backgroundColor = '#e0e0e0';
  }
}

initDB().then(() => {
  loadData();
});