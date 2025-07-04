const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');


let songs = [];
let currentSongIndex = 0;
let playbackHistory = []; // 再生履歴を保存する配列


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
      listItem.dataset.index = songs.length - 1;
      listItem.addEventListener('click', playSelectedSong);
      songList.appendChild(listItem);
    }
  }

    if (songs.length > 0){
        loadSong(currentSongIndex);
    }
});



function loadSong(index) {
    if (index < 0 || index >= songs.length) {
        return;
      }
  const file = songs[index];
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  currentSongTitleDisplay.textContent = file.name;
  audioPlayer.load();
  updatePlayPauseButton();
  highlightCurrentSong();

  // 再生履歴に追加 (現在の曲を再生する前に)
  // すでに履歴にある場合は追加しない (重複防止)
  if (currentSongIndex !== index) { //現在の曲と違う場合のみ履歴に追加する
    playbackHistory.push(currentSongIndex);
  }
  currentSongIndex = index; // index更新は最後

}

function playSelectedSong(event) {
  // currentSongIndex = parseInt(event.target.dataset.index); // ここでは更新しない
  loadSong(parseInt(event.target.dataset.index)); //datasetから取得
  play();
}

function play() {
    audioPlayer.play();
    updatePlayPauseButton();
}
function pause(){
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

// prevButton の動作を変更
prevButton.addEventListener('click', () => {
    if (playbackHistory.length === 0) {
        // 履歴がない場合は、最初の曲に戻る（または何もしない）
        // loadSong(0); // 最初の曲に戻る場合
        return; // 何もしない場合
    }

    // 履歴から最後の曲を取得し、履歴から削除
    const previousIndex = playbackHistory.pop();
    loadSong(previousIndex); //loadsong内でcurrentindexを更新
    play();
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

function highlightCurrentSong(){
    const listItems = songList.querySelectorAll('li');
    listItems.forEach( li => {
        li.style.backgroundColor = '';
    });

    if (listItems[currentSongIndex]){
        listItems[currentSongIndex].style.backgroundColor = '#e0e0e0';
    }
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowRight') {
    nextButton.click();
  } else if (event.key === ' ') {
    playPauseButton.click();
    event.preventDefault();
  } else if (event.code === 'ArrowLeft') { // 左矢印キー
    prevButton.click(); // prevButton をクリック
  }
});

updatePlayPauseButton();