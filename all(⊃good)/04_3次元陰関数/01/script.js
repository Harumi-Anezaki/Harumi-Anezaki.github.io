// シーン、カメラ、レンダラーの設定
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 0, 150);

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ライトの追加
var light = new THREE.DirectionalLight(0xffffff);
light.position.set(1, 1, 1).normalize();
scene.add(light);

// マーチングキューブの設定
var resolution = 50; // 解像度を上げると詳細な形状になるが、処理負荷が増える
var material = new THREE.MeshPhongMaterial({ color: 0x156289, specular: 0x072534, shininess: 100, side: THREE.DoubleSide });
var effect = new THREE.MarchingCubes(resolution, material);
effect.position.set(0, 0, 0);
effect.scale.set(100, 100, 100);
effect.isolation = 0; // 等値面の値（F(x,y,z)=0）
scene.add(effect);

// カメラコントロールの追加
var controls = new THREE.OrbitControls(camera, renderer.domElement);

// ウィンドウリサイズ対応
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ユーザー入力の処理
var functionInput = document.getElementById('functionInput');
var submitBtn = document.getElementById('submitBtn');

submitBtn.addEventListener('click', updateField);

function updateField() {
    var funcStr = functionInput.value;
    if (!funcStr) {
        alert('関数を入力してください。（例: x^2 + y^2 + z^2 - 1）');
        return;
    }
    try {
        // 関数文字列をパースしてコンパイル
        var node = math.parse(funcStr);
        var code = node.compile();

        // フィールド値の更新
        var field = effect.field;
        var resX = effect.resolutionX;
        var resY = effect.resolutionY;
        var resZ = effect.resolutionZ;
        var size = effect.size;
        var halfSize = size / 2;

        var x, y, z, fx, fy, fz, value;
        var index = 0;

        for (var k = 0; k < resZ; k++) {
            fz = (k / resZ) * size - halfSize;
            for (var j = 0; j < resY; j++) {
                fy = (j / resY) * size - halfSize;
                for (var i = 0; i < resX; i++, index++) {
                    fx = (i / resX) * size - halfSize;

                    // ユーザー定義の関数を評価
                    var scope = { x: fx / halfSize, y: fy / halfSize, z: fz / halfSize };
                    try {
                        value = code.evaluate(scope);
                    } catch (e) {
                        value = 0;
                    }

                    // フィールドに値を設定
                    field[index] = value;
                }
            }
        }

        // メッシュの更新
        effect.reset();

    } catch (err) {
        alert('関数の解析にエラーが発生しました: ' + err);
    }
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();