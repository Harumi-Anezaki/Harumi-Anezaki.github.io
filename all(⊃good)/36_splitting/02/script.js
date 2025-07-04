document.addEventListener('DOMContentLoaded', function() {
  // GSAP ScrollTrigger プラグインを登録
  gsap.registerPlugin(ScrollTrigger);

  // Splitting.js 初期化
  Splitting();

  // 各文字要素の取得
  const titleChars = document.querySelectorAll('.hero-title .char');

  // GSAP を使ってスクロールトリガーを設定
  gsap.from(titleChars, {
    opacity: 0,
    y: 50,
    stagger: 0.05,
    duration: 0.75,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".hero-title",
      start: "top center", // hero-titleが画面中央に来たらアニメーション開始
      end: "bottom center", // hero-titleが画面中央から外れたらアニメーション終了
      scrub: true, // スクロールに合わせてアニメーションを再生
      // markers: true, // デバッグ用マーカー
    },
  });

  // ホバーエフェクトをCSSで実装

});