document.addEventListener('DOMContentLoaded', () => {
  const parallaxContainer = document.querySelector('.parallax-container');
  const layers = document.querySelectorAll('.layer');
    const stars = document.querySelectorAll('.star');

  // スクロールイベント
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth);
      const translateY = scrollY * depth;
      layer.style.transform = `translateY(${translateY}px)`;
    });
  });

    // 星のアニメーション (Anime.js)
    anime({
        targets: stars,
        rotate: 360,
        duration: 5000,
        easing: 'linear',
        loop: true, //アニメーションを繰り返す
        direction: 'alternate', // アニメーションの方向を反転
    });

    //マウスが動いた時のアニメーション
    parallaxContainer.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        const moveX = (x - window.innerWidth / 2) * 0.02; //移動量を調整
        const moveY = (y - window.innerHeight / 2) * 0.02;

        layers.forEach(layer => {
            const depth = parseFloat(layer.dataset.depth);
             anime({
                targets: layer,
                translateX: moveX * depth,
                translateY: moveY * depth,
                duration: 500, //アニメーション時間
                easing: 'easeOutExpo',
            });
        });
    });
});