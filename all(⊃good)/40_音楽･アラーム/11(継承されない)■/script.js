const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');

let songs = [];
let currentSongIndex = 0;
let playbackHistory = []; // 再生履歴

folderInput.addEventListener('change', (event) => {
  songs = [];
  songList.innerHTML = '';
  currentSongIndex = 0;
  playbackHistory = []; // フォルダ選択時に履歴をリセット

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
    loadSong(currentSongIndex); // 最初の曲をロード
    // playbackHistory.push(currentSongIndex);  // ここでは履歴に追加しない！
  }
});

function loadSong(index) {
  if (index < 0 || index >= songs.length) {
    return;
  }

  // 現在の曲を履歴に追加。ただし、履歴の最後が現在の曲と同じ場合は追加しない
  if (playbackHistory[playbackHistory.length - 1] !== index) {
    playbackHistory.push(index);
  }

  currentSongIndex = index; // 最初に currentSongIndex を更新

  const file = songs[index];
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  currentSongTitleDisplay.textContent = file.name;
  audioPlayer.load();
  updatePlayPauseButton();
  highlightCurrentSong();
}

function playSelectedSong(event) {
    const index = parseInt(event.target.dataset.index); //文字列から数値に
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

prevButton.addEventListener('click', () => {

    if (playbackHistory.length <= 1) { // <= 1 に変更
        return; // 何もしない
    }
    playbackHistory.pop(); //最後を取り出して､削除
    const previousIndex = playbackHistory[playbackHistory.length -1]; //pop()した後で取得

    loadSong(previousIndex);
    play();

});

nextButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  currentSongIndex = Math.floor(Math.random() * songs.length); //ランダム生成
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
    prevButton.click();
  }
});

updatePlayPauseButton();