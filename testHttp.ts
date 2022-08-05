// // const fs = require('fs');
// // const http = require('http');
// // const path = require('path');

// const optionsTest = {
//   hostname: 'localhost',
//   port: 3000,
//   path: '/sparql',
//   method: 'POST',
//   headers: {
//     'Accept': 'table',
//     'Content-Type': 'application/x-www-form-urlencoded',
//   }
// };

// let watdiv = {};
// let names = [];
// let queryFolder = 'output/queries';
// let filenames = fs.readdirSync(queryFolder);
// for (let filename of filenames) {
//   let queries = fs.readFileSync(path.join(queryFolder, filename), 'utf8').split('\n\n').filter((x) => x.length > 0);
//   let name = filename.replace(/\.txt$/, '');
//   watdiv[name] = queries;
//   names.push(name);
// }

// let loops = 4;
// console.log(`name;id;results;time`);
// callRecursive(0, 0);

// function callRecursive(nameId, id) {
//   let name = names[nameId];
//   callQuery(watdiv[name][id], (results, time) => {
//     console.log(`${name};${id};${results};${time}`);
//     ++id;
//     // if (id >= watdiv[name].length) {
//     //   id = 0;
//     //   ++nameId
//     // }
//     // if (nameId < names.length) {
//     //   callRecursive(nameId, id);
//     // } else if (--loops > 0) {
//     //   callRecursive(0, 0);
//     // }
//   });
// }
// function stopQ(hrstart) {
//     // execution time simulated with setTimeout function
//     let hrend = process.hrtime(hrstart);
//     return hrend[0]*1000 + hrend[1]/1000000;
//   }

// function callQuery(query, done) {
//   let hrstart = process.hrtime();
//   let count = -2; // ignore header lines
//   const req = http.request(optionsTest, res => {
//     res.on('data', data => { /*console.log(data.toString());*/ count += data.toString().split('\n').filter(x => x.trim().length > 0).length; });
//     res.on('end', () => {
//       done(count, Math.floor(stopQ(hrstart)));
//     });
//   });

//   req.write('query=' + query);
//   req.end();
// }



