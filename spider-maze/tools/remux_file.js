const fs = require('fs');
const { remuxFMP4ToProgressive } = require('./mp4_remuxer');

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node remux_file.js <input.mp4> [output.mp4]");
  process.exit(1);
}
const outputPath = process.argv[3] || inputPath.replace(/\.mp4$/i, '_youtube_ready.mp4');

console.log(`Remuxing: ${inputPath}`);
console.log(`Output:   ${outputPath}`);
const rawBuf = fs.readFileSync(inputPath);
const ab = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
const progBuf = remuxFMP4ToProgressive(ab);
fs.writeFileSync(outputPath, Buffer.from(progBuf));
console.log(`Successfully converted fMP4 to YouTube Shorts Progressive MP4! (${(progBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
