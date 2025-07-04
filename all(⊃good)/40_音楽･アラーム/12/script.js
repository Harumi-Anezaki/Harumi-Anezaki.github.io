const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');

let songs = [];
let currentSongIndex = 0;
// let playbackHistory = [];  // 再生履歴は不要なので削除

// データの読み込み (localStorage から)
function loadData() {
  const savedSongs = localStorage.getItem('songs');
  const savedIndex = localStorage.getItem('currentSongIndex');
  // const savedHistory = localStorage.getItem('playbackHistory'); // 削除

  if (savedSongs) {
    songs = JSON.parse(savedSongs);
    songs.forEach((fileInfo, index) => {
      const listItem = document.createElement('li');
      listItem.textContent = fileInfo.name;
      listItem.dataset.index = index;
      listItem.addEventListener('click', playSelectedSong);
      songList.appendChild(listItem);
    });
  }
  if (savedIndex) {
    currentSongIndex = parseInt(savedIndex);
  }

  if (songs.length > 0) {
    loadSong(currentSongIndex); // loadSongを呼び出し
  }
}

// データの保存 (localStorage へ)
function saveData() {
  const songsToSave = songs.map(file => ({
    name: file.name,
    type: file.type,
    // lastModified: file.lastModified,  // 必要に応じて
  }));

  localStorage.setItem('songs', JSON.stringify(songsToSave));
  localStorage.setItem('currentSongIndex', currentSongIndex.toString());
  // localStorage.setItem('playbackHistory', JSON.stringify(playbackHistory)); // 削除
}


folderInput.addEventListener('change', (event) => {
  songs = [];
  songList.innerHTML = '';
  currentSongIndex = 0;
  // playbackHistory = []; // 不要なので削除

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
  if (songs.length > 0) {
    loadSong(currentSongIndex);
  }
  saveData(); // フォルダ選択時にもデータを保存
});

// loadSong関数: addToHistory引数も不要なので削除
function loadSong(index) {
  if (index < 0 || index >= songs.length) {
    return;
  }

  // playbackHistoryへの追加処理も削除
  currentSongIndex = index;

  const file = songs[index];
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  currentSongTitleDisplay.textContent = file.name;
  audioPlayer.load();
  updatePlayPauseButton();
  highlightCurrentSong();
  saveData();
}

function playSelectedSong(event) {
  const index = parseInt(event.target.dataset.index);
  loadSong(index);
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

playPauseButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  if (audioPlayer.paused) {
    play();
  } else {
    pause();
  }
});

// prevButton: 再生履歴を使わないように変更
prevButton.addEventListener('click', () => {
    // 前の曲に戻るのではなく、最初の曲に戻るシンプルな動作に変更
    if (songs.length > 0) {
        loadSong(0);
        play();
    }
});

nextButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  currentSongIndex = Math.floor(Math.random() * songs.length);
  loadSong(currentSongIndex);
  play();
});

audioPlayer.addEventListener('ended', () => {
  if (songs.length === 0) return;
  currentSongIndex = Math.floor(Math.random() * songs.length);
  loadSong(currentSongIndex);
  play();
});

function highlightCurrentSong() {
  const listItems = songList.querySelectorAll('li');
  listItems.forEach((li) => {
    li.style.backgroundColor = '';
  });

  if (listItems[currentSongIndex]) {
    listItems[currentSongIndex].style.backgroundColor = '#e0e0e0';
  }
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowRight') {
    nextButton.click();
  } else if (event.key === ' ') {
    playPauseButton.click();
    event.preventDefault();
  } else if (event.code === 'ArrowLeft') {
     prevButton.click(); //  prevButton をクリック
  }
});

loadData(); //ロード
updatePlayPauseButton();