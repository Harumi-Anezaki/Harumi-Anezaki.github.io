// ターゲットとなるテキスト(問題文)
const texts = [
  "Hello World",
  "animejs is awesome",
  "Typing Game",
  "JavaScript",
  "Animation Effects",
  "Interactive Design"
];

let currentTextIndex = 0;
let currentLetterIndex = 0;
let score = 0;
let combo = 0;
let isPlaying = false; //ゲーム状態

const targetTextElement = document.getElementById('target-text');
const inputTextElement = document.getElementById('input-text');
const messageElement = document.getElementById('message');
const scoreElement = document.getElementById('score');
const comboElement = document.getElementById('combo');
const animationArea = document.querySelector('.animation-area');

// 初期化
function init() {
  currentTextIndex = 0;
  currentLetterIndex = 0;
  score = 0;
  combo = 0;
  isPlaying = true;
  updateTargetText();
  updateScore();
  updateCombo();
  inputTextElement.value = '';
  messageElement.textContent = 'Start typing!';
  inputTextElement.focus(); //入力欄にフォーカス

}

// ターゲットテキストの更新
function updateTargetText() {
    //残り文字をスパンタグで囲み、色分け
    let highlightedText = '';
    for(let i = 0; i < texts[currentTextIndex].length; i++){
        if(i < currentLetterIndex){
            highlightedText += `<span style="color: green;">${texts[currentTextIndex][i]}</span>`;
        } else {
            highlightedText += `<span>${texts[currentTextIndex][i]}</span>`;
        }
    }
  targetTextElement.innerHTML = highlightedText; // innerHTML を使用
}

//スコア表示
function updateScore() {
  scoreElement.textContent = `Score: ${score}`;
}

//コンボ表示
function updateCombo(){
    comboElement.textContent = `Combo: ${combo}`;
}

//キー入力イベント
inputTextElement.addEventListener('input', () => {
  if (!isPlaying) return;

  const inputChar = inputTextElement.value[currentLetterIndex];
  const correctChar = texts[currentTextIndex][currentLetterIndex];


  if (inputChar === correctChar) {
    // 正解の場合
    currentLetterIndex++;
    score++;
    combo++;
    updateScore();
    updateCombo();
    messageElement.textContent = 'Correct!';
    playCorrectAnimation();
    if(combo >= 5){
        playComboAnimation();
    }
    inputTextElement.value = inputTextElement.value.slice(0,currentLetterIndex); //入力文字削除


    if (currentLetterIndex === texts[currentTextIndex].length) {
      // 次の問題へ
        currentTextIndex++;

        if(currentTextIndex === texts.length){
          //全問題クリア
          messageElement.textContent = "Congratulations! You cleared all levels!"
          isPlaying = false; //ゲーム停止
          return; //以降の処理をしない
        }

      currentLetterIndex = 0;
      inputTextElement.value = '';
      messageElement.textContent = "Next Word!"
      updateTargetText();

    } else{
        updateTargetText();
    }


  } else if(correctChar === undefined){
      //入力文字が、問題文字数を超えた場合
      inputTextElement.value = inputTextElement.value.slice(0,currentLetterIndex); //余分な文字を消す。
  }  else {
    // 不正解の場合
    combo = 0; //コンボリセット
    updateCombo();
    messageElement.textContent = 'Incorrect!';
    playIncorrectAnimation();
  }
});

// 正解アニメーション
function playCorrectAnimation() {
  const animation = document.createElement('div');
  animation.classList.add('correct-animation');
  animationArea.appendChild(animation);

    //ランダムな位置にアニメーションを発生
    const x = Math.random() * animationArea.offsetWidth;
    const y = Math.random() * animationArea.offsetHeight;

  anime({
    targets: animation,
    translateX: x,
    translateY: y,
    opacity: [1, 0], // フェードインしてフェードアウト
    scale: [1, 2],   //少し大きく
    duration: 800,
    easing: 'easeOutExpo',
    complete: () => {
      animation.remove(); // アニメーション終了後に要素を削除
    }
  });
}

//コンボアニメーション
function playComboAnimation(){
    const animation = document.createElement('div');
    animation.classList.add('combo-animation');
    animationArea.appendChild(animation);

     //ランダムな位置にアニメーションを発生
     const x = Math.random() * animationArea.offsetWidth;
     const y = Math.random() * animationArea.offsetHeight;

    anime({
        targets: animation,
        translateX: x,
        translateY: y,
        opacity: [1,0],
        scale: [1,3],
        rotate: '1turn',
        duration: 1200,
        easing: 'easeOutBounce',
        complete: () => {
            animation.remove();
        }
    })
}

//不正解アニメーション
function playIncorrectAnimation(){
    const animation = document.createElement('div');
    animation.classList.add('incorrect-animation');
    animationArea.appendChild(animation);

    anime.timeline({
        targets: animation,
    })
    .add({
        opacity: [0,1],
        width: [10,50],
        duration: 300,
        easing: 'easeInOutSine'
    })
    .add({
        opacity: [1,0],
        width: [50,10],
        duration: 300,
        easing: 'easeInOutSine',
        complete: () => {
            animation.remove();
        }
    })
}

// ゲーム開始
init();