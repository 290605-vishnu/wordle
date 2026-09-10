const fs = require("fs");
let content = fs.readFileSync("game.js", "utf8");

// Fix the broken getShareString function (lines ~207-213 collapsed)
const badPattern = /function getShareString\(\) \{[\s\S]*?\}/;
const fixed = `function getShareString() {
  return "\uD83E\uDD16 AI Wordle \u2014 " + targetWord + " (" + wordLength + " letters)\\n" + shareRows.length + "/6\\n\\n" + shareRows.join("\\n");
}`;
content = content.replace(badPattern, fixed);
fs.writeFileSync("game.js", content, "utf8");
console.log("Patched getShareString");
