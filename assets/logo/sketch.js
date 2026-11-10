// neoplasticism logo
// Three fans of lines (yellow, blue, red) that weave through each other on black.
// Each fan gets its own randomSeed, same trick as the original sketch.
//
// Keys:  r = new seed   d = toggle cut (difference) blend   i = icon mode
//        g = toggle white glue grid   s = save PNG

const PAL = {
  bg: "#141414",
  y: "#e8df95",
  b: "#8fd0ff",
  r: "#fdaeba",
  glue: "#ffffff",
};

const P = {
  size: 800,
  lines: 60,       // lines per fan
  weight: 1.4,     // stroke weight at 800px
  spread: 0.5,     // width of each fan's base, as a fraction of the canvas
  radius: 0.42,    // how far from center the fan bases sit
  twist: 0.35,     // how far each apex is pushed off-center (radians), sets the crossing angles
  jitter: 0.12,    // how much the seed can nudge things
  margin: 0.06,    // empty border so lines don't run off the edge
  cut: false,      // difference blend: overlaps cancel into dark gaps
  icon: false,     // fewer, thicker lines that survive at 16-32px
  glue: false,     // thin white Mondrian grid on top
};

let seed;

function setup() {
  createCanvas(P.size, P.size);
  pixelDensity(2);
  strokeCap(SQUARE);
  seed = int(random(1e7));
  noLoop();
}

// One fan: a base segment perpendicular to its angle, all lines converging on one apex.
function makeFan(k, s) {
  randomSeed(s);
  const c = createVector(width / 2, height / 2);
  const R = width * P.radius;

  // three fans spaced 120 degrees apart, nudged by the seed
  const theta = -HALF_PI + k * TWO_PI / 3 + random(-P.jitter, P.jitter);
  const baseC = p5.Vector.fromAngle(theta).mult(R * random(1 - P.jitter, 1)).add(c);
  const along = p5.Vector.fromAngle(theta + HALF_PI);

  // apex sits across the canvas, twisted off-center so the fans cross at an angle
  const apexAngle = theta + PI + P.twist + random(-P.jitter, P.jitter);
  const apex = p5.Vector.fromAngle(apexAngle).mult(R * random(0.55, 0.85)).add(c);

  return { baseC, along, apex, spread: width * P.spread * random(0.85, 1.15) };
}

function draw() {
  randomSeed(seed);
  const seeds = [random(1e9), random(1e9), random(1e9)];
  const fans = seeds.map((s, k) => makeFan(k, s));
  const colours = [PAL.y, PAL.b, PAL.r];

  const n = P.icon ? 14 : P.lines;
  const w = (P.icon ? 7 : P.weight) * (width / 800);

  background(PAL.bg);

  // clip to the inner square so the composition reads as one object
  const m = width * P.margin;
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(m, m, width - 2 * m, height - 2 * m);
  drawingContext.clip();

  blendMode(P.cut ? DIFFERENCE : BLEND);
  strokeWeight(w);

  // interleaved on purpose: line i of every colour before line i+1,
  // so no colour sits fully on top and the crossings weave
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    fans.forEach((f, k) => {
      const start = p5.Vector.mult(f.along, t * f.spread).add(f.baseC);
      stroke(colours[k]);
      line(start.x, start.y, f.apex.x, f.apex.y);
    });
  }

  blendMode(BLEND);

  if (P.glue) {
    // the white "glue": two thin Mondrian lines at seeded, off-center positions
    randomSeed(seed + 1);
    stroke(PAL.glue);
    strokeWeight(width * 0.012);
    const gx = width * random([0.33, 0.38, 0.62, 0.67]);
    const gy = height * random([0.33, 0.38, 0.62, 0.67]);
    line(gx, 0, gx, height);
    line(0, gy, width, gy);
  }

  drawingContext.restore();
  console.log("seed", seed, P);
}

function keyPressed() {
  if (key === "r") seed = int(random(1e7));
  if (key === "d") P.cut = !P.cut;
  if (key === "i") P.icon = !P.icon;
  if (key === "g") P.glue = !P.glue;
  if (key === "s") saveCanvas(`neoplasticism-${seed}${P.icon ? "-icon" : ""}`, "png");
  redraw();
}
