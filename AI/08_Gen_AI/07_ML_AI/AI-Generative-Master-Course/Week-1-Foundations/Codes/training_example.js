class Perceptron {
  constructor() {
    this.w1 = Math.random();
    this.w2 = Math.random();
    this.bias = 0;
    this.learningRate = 0.1;

    console.log("INITIAL STATE");
    console.log("w1:", this.w1.toFixed(3), "w2:", this.w2.toFixed(3), "bias:", this.bias);
    console.log("---------------------------");
  }

  predict(x1, x2) {
    let sum = (x1 * this.w1) + (x2 * this.w2) + this.bias;

    console.log(`  Sum = ${x1}*${this.w1.toFixed(3)} + ${x2}*${this.w2.toFixed(3)} + ${this.bias.toFixed(3)} = ${sum.toFixed(3)}`);

    return sum > 0 ? 1 : 0;
  }

  train(trainingData) {
    for (let epoch = 1; epoch <= 5; epoch++) {  // keep small so readable
      console.log(`\n===== EPOCH ${epoch} =====`);

      for (let data of trainingData) {
        let { x1, x2, output } = data;

        console.log(`\nInput: (${x1}, ${x2})  Expected: ${output}`);

        let guess = this.predict(x1, x2);

        console.log("  Prediction:", guess);

        let error = output - guess;

        console.log("  Error:", error);

        if (error !== 0) {
          let oldW1 = this.w1;
          let oldW2 = this.w2;
          let oldBias = this.bias;

          this.w1 += this.learningRate * error * x1;
          this.w2 += this.learningRate * error * x2;
          this.bias += this.learningRate * error;

          console.log("  ❗ Updating weights...");
          console.log(`    w1: ${oldW1.toFixed(3)} → ${this.w1.toFixed(3)}`);
          console.log(`    w2: ${oldW2.toFixed(3)} → ${this.w2.toFixed(3)}`);
          console.log(`    bias: ${oldBias.toFixed(3)} → ${this.bias.toFixed(3)}`);
        } else {
          console.log("  ✅ Correct — no update needed");
        }
      }
    }
  }
}

let trainingData = [
  { x1: 0, x2: 0, output: 0 },
  { x1: 0, x2: 1, output: 0 },
  { x1: 1, x2: 0, output: 0 },
  { x1: 1, x2: 1, output: 1 }
];

let brain = new Perceptron();

brain.train(trainingData);

console.log("\n=== FINAL TEST ===");
for (let d of trainingData) {
  console.log(`${d.x1}, ${d.x2} → ${brain.predict(d.x1, d.x2)}`);
}
