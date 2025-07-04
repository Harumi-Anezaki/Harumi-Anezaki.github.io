const folderInput = document.getElementById('folderInput');
const audioPlayer = document.getElementById('audioPlayer');
const songList = document.getElementById('songList');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const currentSongTitleDisplay = document.getElementById('current-song-title');


let songs = [];
let currentSongIndex = 0;

folderInput.addEventListener('change', (event) => {
  songs = []; // Reset the songs array
  songList.innerHTML = ''; // Clear the song list
  currentSongIndex = 0; //reset index

  const files = event.target.files;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('audio/')) { // Ensure it's an audio file
      songs.push(file);
      const listItem = document.createElement('li');
      listItem.textContent = file.name;
      listItem.dataset.index = songs.length - 1; // Store the index
      listItem.addEventListener('click', playSelectedSong);
      songList.appendChild(listItem);
    }
  }

    if (songs.length > 0){
        loadSong(currentSongIndex); //load first song.
    }
});



function loadSong(index) {
    if (index < 0 || index >= songs.length) {
        return; // Prevent out-of-bounds access
      }
  const file = songs[index];
  const url = URL.createObjectURL(file);
  audioPlayer.src = url;
  currentSongTitleDisplay.textContent = file.name;
  audioPlayer.load(); // Important: load() after changing src
  //play(); 不要な自動再生は避ける
  updatePlayPauseButton();  // update button state
  highlightCurrentSong();

}

function playSelectedSong(event) {
  currentSongIndex = parseInt(event.target.dataset.index);
  loadSong(currentSongIndex);
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
    if (songs.length === 0) return; // No songs to play
  if (audioPlayer.paused) {
    play();
  } else {
    pause();
  }
});

prevButton.addEventListener('click', () => {
    if (songs.length === 0) return;
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length; // Wrap around
  loadSong(currentSongIndex);
    play();
});

// 次へボタンの動作をランダム再生に変更
nextButton.addEventListener('click', () => {
    if (songs.length === 0) return;
    // ランダムなインデックスを選択
    currentSongIndex = Math.floor(Math.random() * songs.length);
    loadSong(currentSongIndex);
    play();
});


audioPlayer.addEventListener('ended', () => {
    if (songs.length === 0) return;
      // endedイベントもランダム再生にする場合
      currentSongIndex = Math.floor(Math.random() * songs.length);
      loadSong(currentSongIndex);
      play();

    // // Play the next song automatically (順番に再生する場合)
    // currentSongIndex = (currentSongIndex + 1) % songs.length;
    // loadSong(currentSongIndex);
    //   play();
});

function highlightCurrentSong(){
    const listItems = songList.querySelectorAll('li');
    listItems.forEach( li => {
        li.style.backgroundColor = ''; //reset color.
    });

    if (listItems[currentSongIndex]){
        listItems[currentSongIndex].style.backgroundColor = '#e0e0e0';
    }
}

// Initial button state update
updatePlayPauseButton();