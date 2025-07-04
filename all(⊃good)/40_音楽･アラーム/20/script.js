const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');

let db;
let songs = [];
let currentSongIndex = 0;
let playbackHistory = [];

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

            // 最後の曲、または最初の曲をロード
            if (playbackHistory.length > 0) {
                currentSongIndex = playbackHistory[playbackHistory.length - 1];
            } else if(songs.length > 0){
                currentSongIndex = songs[0].id;
            }
            if(songs.length > 0){
                loadSong(currentSongIndex, false).then(() => {
                    // prevButton と nextButton のイベントリスナーをここで登録
                    prevButton.addEventListener('click', handlePrevButtonClick);
                    nextButton.addEventListener('click', handleNextButtonClick);
                    resolve();
                });
                return;
            }
            resolve();
        };

        getHistory.onerror = (event) => {
            console.error("Error loading playback history:", event);
            resolve();
        }
    };
    getAllSongs.onerror = () => {
        console.error("Error loading songs", getAllSongs.error);
        resolve();
    }
  });
}

function saveSongs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['songs'], 'readwrite');
        const objectStore = transaction.objectStore('songs');
        objectStore.clear();

        songs.forEach((song) => {
          const request = objectStore.add(song);
          request.onsuccess = () => {  };
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
        transaction.onerror = () => reject();
    });
}

function resetDB() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    const transaction = db.transaction(['songs', 'playbackHistory'], 'readwrite');
    const songStore = transaction.objectStore('songs');
    const historyStore = transaction.objectStore('playbackHistory');
    const clearSongsRequest = songStore.clear();
    const clearHistoryRequest = historyStore.clear();

    clearSongsRequest.onsuccess = () => {
      clearHistoryRequest.onsuccess = () => resolve();
      clearHistoryRequest.onerror = (event) => reject(event);
    };
    clearSongsRequest.onerror = (event) => reject(event);
  });
}

folderInput.addEventListener('change', async (event) => {
  await resetDB();

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
        }
    });
}

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

// prevButton のイベントハンドラ
const handlePrevButtonClick = async () => {
    if (playbackHistory.length <= 1) {
        return;
    }
    playbackHistory.pop();
    const previousIndex = playbackHistory[playbackHistory.length - 1];
    await loadSong(previousIndex);
    play();
};

// nextButton のイベントハンドラ
const handleNextButtonClick = async () => {
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
};

audioPlayer.addEventListener('ended', async () => {
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

document.addEventListener('DOMContentLoaded', () => {
    // ボタンのイベントリスナー (playPauseButton のみ)
    playPauseButton.addEventListener('click', () => {
        if (songs.length === 0) return;
        if (audioPlayer.paused) {
            play();
        } else {
            pause();
        }
    });

    // キーボードイベント
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
});

initDB().then(() => {
    audioPlayer.onloadeddata = () => {
        updatePlayPauseButton();
        highlightCurrentSong();
    };

    loadData();
});