const fs = require("fs");
const lines = fs.readFileSync("game.js", "utf8").split("\n");
// Fix template literal lines that were mangled
lines[53] = "  boardEl.style.gridTemplateColumns = 'repeat(' + wordLength + ', var(--tile-size))';";
lines[54] = "  boardEl.style.gridTemplateRows = 'repeat(' + MAX_GUESSES + ', var(--tile-size))';";
// Fix tile id line
for (let i = 55; i < 70; i++) {
  if (lines[i] && lines[i].includes("tile--")) {
    lines[i] = "      tile.id = 'tile-' + r + '-' + c;";
    break;
  }
}
fs.writeFileSync("game.js", lines.join("\n"), "utf8");
console.log("Fixed!");
