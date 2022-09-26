"use strict";
const fs = require("fs");
const sampleSize = .8;
const data = fs.readFileSync('output/dataset.nt');
const tripleArray = data.toString().split(' .');
const sampledTriples = [];
for (const triple of tripleArray) {
    // Add back the removed splitter 
    const randomSelect = Math.random();
    if (sampleSize > randomSelect) {
        const tripleFull = triple + ' .';
        sampledTriples.push(tripleFull);
    }
}
console.log(sampledTriples.join('\n'));
fs.writeFileSync("outputSampled/dataset.nt", sampledTriples.join(' '));
// console.log(data.toString());
// console.log(tripleArray[0] + ' .');
// console.log(tripleArray.length)
// console.log(data.toString());
//# sourceMappingURL=subSampleWatDiv.js.map