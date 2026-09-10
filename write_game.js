const fs = require('fs');

const gameCode = fs.readFileSync('game_template.js', 'utf8');
fs.writeFileSync('game.js', gameCode, 'utf8');
console.log('Done');
