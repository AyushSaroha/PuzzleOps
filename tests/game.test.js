const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const test = require("node:test");

const sourceDirectory = path.join(__dirname, "..", "src");

test("the deployable website assets exist and are connected", () => {
  const index = fs.readFileSync(
    path.join(sourceDirectory, "index.html"),
    "utf8",
  );
  const script = fs.readFileSync(
    path.join(sourceDirectory, "script.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(sourceDirectory, "style.css"),
    "utf8",
  );

  assert.match(index, /href="style\.css"/);
  assert.match(index, /src="script\.js"/);
  assert.match(index, /id="board"/);
  assert.match(script, /function shuffleBoard/);
  assert.match(stylesheet, /\.board/);
});
