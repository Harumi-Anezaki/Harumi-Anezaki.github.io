document.addEventListener('DOMContentLoaded', function() {
  // Splitting.js を初期化
  Splitting();

  // 分割された文字要素を取得
  const characters = document.querySelectorAll('.char');

  // 各文字に順番に 'active' クラスを付与してアニメーションさせる
  characters.forEach((char, index) => {
    setTimeout(() => {
      char.classList.add('active');
    }, 50 * index); // 各文字に50msの間隔をあける
  });
});