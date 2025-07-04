// Plantクラス
class Plant {
  constructor(genes) {
    this.genes = genes || this.createRandomGenes(); // 遺伝子がない場合はランダムに作成
  }

  createRandomGenes() {
    return {
      branchAngle: random(0, 360),
      branchLength: random(50, 150),
      branchThickness: random(2, 10),
      leafSize: random(5, 20),
      leafColor: color(random(255), random(255), random(255)),
      numBranches: floor(random(3, 8))
    };
  }

  draw(x, y) {
    push(); // 現在の変換状態を保存
    translate(x, y); // 植物の原点を移動
    this.drawBranch(this.genes.branchLength, this.genes.branchThickness, 0); // メインの枝を描画
    pop(); // 保存した変換状態を復元
  }

  drawBranch(len, thickness, depth) {
    strokeWeight(thickness);
    stroke(0); // 枝の色を黒に設定
    line(0, 0, 0, -len); // 枝を描画
    translate(0, -len); // 次の枝のために原点を移動

    if (depth < this.genes.numBranches) {
      for (let i = 0; i < 2; i++) { // 左右に枝を生やす
        push();
        if (i === 0) {
          rotate(radians(this.genes.branchAngle));
        } else {
          rotate(radians(-this.genes.branchAngle));
        }
        this.drawBranch(len * 0.7, thickness * 0.7, depth + 1); // 再帰的に枝を描画
        pop();
      }
    } else {
      // 葉を描画
      fill(this.genes.leafColor);
      noStroke();
      ellipse(0, 0, this.genes.leafSize, this.genes.leafSize);
    }
  }

  // 交叉
  crossover(partner) {
    let newGenes = {};
    for (let gene in this.genes) {
      // 確率で親の遺伝子を受け継ぐ
      newGenes[gene] = random() > 0.5 ? this.genes[gene] : partner.genes[gene];
    }
    return new Plant(newGenes);
  }

  // 突然変異
  mutate(mutationRate) {
    for (let gene in this.genes) {
      if (random() < mutationRate) {
        // 遺伝子ごとに突然変異
        if (gene === 'leafColor') {
          this.genes[gene] = color(random(255), random(255), random(255)); // ランダムな色
        } else if (typeof this.genes[gene] === 'number') {
          this.genes[gene] += random(-10, 10); // 数値の場合、ランダムな値を加算
          this.genes[gene] = constrain(this.genes[gene], 0, 360); // 値を範囲内に制限
        }
      }
    }
  }

  // 適合度を計算
  calculateFitness(userValues) {
      let fitness = 0;

      // UIからの値を正規化
      let normBranchAngle   = map(this.genes.branchAngle, 0, 360, 0, 1);
      let normBranchLength  = map(this.genes.branchLength, 50, 150, 0, 1);
      let normBranchThickness = map(this.genes.branchThickness, 2, 10, 0, 1);
      let normLeafSize      = map(this.genes.leafSize, 5, 20, 0, 1);
      let normNumBranches   = map(this.genes.numBranches, 3, 8, 0, 1);

      // ユーザーが設定したパラメータとの差を計算 (単純な例)
      fitness += abs(normBranchAngle   - userValues.normBranchAngle);
      fitness += abs(normBranchLength  - userValues.normBranchLength);
      fitness += abs(normBranchThickness - userValues.normBranchThickness);
      fitness += abs(normLeafSize      - userValues.normLeafSize);
      fitness += abs(normNumBranches   - userValues.normNumBranches);

      //  0に近いほど適合度が高い
      return 1 / (1 + fitness); // 0-1の範囲に収まるように調整

  }
}

// GAクラス
class GA {
  constructor(populationSize, mutationRate) {
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.population = [];
    this.matingPool = [];
    this.generations = 0;

    // 初期集団を生成
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push(new Plant());
    }
  }

  // 評価
  evaluate(userValues) {
    this.matingPool = [];
    let maxFitness = 0;

    // 一番良い個体を見つける
    for (let i = 0; i < this.population.length; i++) {
      let fitness = this.population[i].calculateFitness(userValues); // ユーザーの評価を渡す
      if (fitness > maxFitness) {
        maxFitness = fitness;
      }
    }

    // 適合度に基づいて mating pool を作成
    for (let i = 0; i < this.population.length; i++) {
      let fitness = this.population[i].calculateFitness(userValues); // ユーザーの評価を渡す
      let n = floor(map(fitness, 0, maxFitness, 1, 10)); // 適合度が高いほど多く追加
      for (let j = 0; j < n; j++) {
        this.matingPool.push(this.population[i]);
      }
    }
  }

  // 選択
  selection() {
    let newPopulation = [];
    for (let i = 0; i < this.population.length; i++) {
      let parentA = random(this.matingPool);
      let parentB = random(this.matingPool);
      let child = parentA.crossover(parentB); // 交叉
      child.mutate(this.mutationRate); // 突然変異
      newPopulation.push(child);
    }
    this.population = newPopulation;
    this.generations++;
  }

  getBestPlant() {
    let bestPlant = null;
    let maxFitness = 0;
    for (let i = 0; i < this.population.length; i++) {
      let fitness = this.calculateFitness(this.population[i]);
      if (fitness > maxFitness) {
        maxFitness = fitness;
        bestPlant = this.population[i];
      }
    }
    return bestPlant;
  }

  getAverageFitness() {
    let totalFitness = 0;
    for (let i = 0; i < this.population.length; i++) {
      totalFitness += this.calculateFitness(this.population[i]);
    }
    return totalFitness / this.population.length;
  }
}

// P5.js sketch
let ga;
let populationSize = 20;
let mutationRate = 0.01;
let canvasWidth = 800;
let canvasHeight = 600;

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('canvas-container'); // canvasをcontainerに入れる
  ga = new GA(populationSize, mutationRate);

  // UI要素との連携
  let evaluateButton = select('#evaluateButton');
  evaluateButton.mousePressed(evaluatePopulation);

  // 初期表示
  //displayPlant(ga.population[0]); // 最初の植物を表示
}

function draw() {
  background(220);

  // 複数の植物を表示
  let plantSpacingX = canvasWidth / (populationSize / 2);
  let plantSpacingY = canvasHeight / 2;

  for (let i = 0; i < ga.populationSize; i++) {
    let x = (i % (populationSize / 2)) * plantSpacingX + plantSpacingX / 2;
    let y = (i < populationSize / 2) ? plantSpacingY / 2 : plantSpacingY + plantSpacingY / 2;
    ga.population[i].draw(x, y);  // 植物を描画
  }

  // 世代数を表示
  select('#generationCounter').html("世代: " + ga.generations);
}

// 評価ボタンが押されたときの処理
function evaluatePopulation() {
    // UIから値を取得
    let branchAngleValue = select('#branchAngle').value();
    let leafColorValue = select('#leafColor').value();
    let branchLengthValue = select('#branchLength').value();
    let branchThicknessValue = select('#branchThickness').value();
    let leafSizeValue = select('#leafSize').value();
    let numBranchesValue = select('#numBranches').value();

    // 取得した値を正規化
    let normBranchAngle   = map(branchAngleValue, 0, 360, 0, 1);
    let normBranchLength  = map(branchLengthValue, 50, 150, 0, 1);
    let normBranchThickness = map(branchThicknessValue, 2, 10, 0, 1);
    let normLeafSize      = map(leafSizeValue, 5, 20, 0, 1);
    let normNumBranches   = map(numBranchesValue, 3, 8, 0, 1);


    // ユーザーが設定した好みの値をまとめる
    let userValues = {
        normBranchAngle:   normBranchAngle,
        normBranchLength:  normBranchLength,
        normBranchThickness: normBranchThickness,
        normLeafSize:      normLeafSize,
        normNumBranches:   normNumBranches
    };

    ga.evaluate(userValues); // 評価
    ga.selection(); // 選択
}