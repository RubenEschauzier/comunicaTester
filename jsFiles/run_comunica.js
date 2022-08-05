"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// const v8 = require('v8');
// v8.setFlagsFromString('--stack-size=4096');
const fs = require('fs');
const http = require('http');
const path = require('path');
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/sparql',
    method: 'POST',
    headers: {
        'Accept': 'table',
        'Content-Type': 'application/x-www-form-urlencoded',
    }
};
// class queryTester {
//     myEngine: any;
//     timer: any;
//     logger: any;
//     constructor(){
//         const QueryEngine = require('@comunica/query-sparql-file').QueryEngineFactory;
//         // const QueryEngineFactory = require('@comunica/query-sparql').QueryEngineFactory;
//         // const timer = require('@comunica/logger-timer').LoggerTimer;
//         // console.log(timer);
//         const myEngine = new QueryEngine().create({
//             configPath: __dirname+"/config.json", // Relative or absolute path 
//         });
//         this.myEngine = new QueryEngine();
//     }
//     async queryComunica(query: string, sources:string[]) {
//         /* Timing the command is still wrong */
//         this.myEngine = await this.myEngine;
//         const bindingsStream = await this.myEngine.query(query, {sources: sources});
//         return bindingsStream;
//     }
//     timedQueryExecution(query: string, sources: string[]){
//         const start: number = performance.now();
//         const bindingResult = this.queryComunica(query, sources);
//         let elapsed: number = performance.now() - start;
//         return elapsed;
//     }
// }
// class queryTesterTest {
//     myEngine: any;
//     timer: any;
//     constructor(){
//         const QueryEngine = require('@comunica/query-sparql').QueryEngine;
//         this.myEngine = new QueryEngine();
//     }
//     async queryComunica(query: string, sources:string[]) {
//         /* Timing the command is still wrong */
//         this.myEngine = await this.myEngine;
//         console.log(this.myEngine);
//         const bindingsStream = await this.myEngine.query(query, {sources: sources});
//         return bindingsStream;
//     }
//     timedQueryExecution(query: string, sources: string[]){
//         const start: number = performance.now();
//         const bindingResult = this.queryComunica(query, sources);
//         let elapsed: number = performance.now() - start;
//         return elapsed;
//     }
// }
class trainComunicaModel {
    constructor() {
        const QueryEngine = require('@comunica/query-sparql-file').QueryEngineFactory;
        this.modelTrainer = require('@comunica/model-trainer');
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
        // this.masterTree = new MCTSMasterTree();
        this.engine = new QueryEngine().create({
            configPath: __dirname + "/config-file.json", // Relative or absolute path 
        });
        this.queries = [];
    }
    async executeQuery(query, sources) {
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, { sources: sources, masterTree: this.masterTree });
        return bindingsStream;
    }
    async explainQuery(query, sources) {
        const results = await this.engine.explain(query, { sources: sources, masterTree: this.masterTree });
        return results;
    }
    async trainModel(masterMap, lossEpisode) {
        const episodeLoss = this.engine.trainModel(masterMap, lossEpisode);
        return await episodeLoss;
    }
    async loadWatDivQueries(queryDir) {
        const fs = require('fs');
        const path = require('path');
        const loadingComplete = new Promise(async (resolve, reject) => {
            try {
                // Get the files as an array
                const files = await fs.promises.readdir(queryDir);
                for (const file of files) {
                    // Get the full paths
                    const filePath = path.join(queryDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    this.queries.push(data);
                }
                resolve(true);
            }
            catch (e) {
                console.error("Something went wrong.", e);
                reject();
            }
        });
        return loadingComplete;
    }
    resetMasterTree() {
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
    }
}
const nResults = [
    0, 0, 0, 0, 4374, 4374, 0, 0, 1,
    0, 0, 0, 0, 0, 33, 33, 3, 3,
    1, 1, 60, 34, 0, 0, 2, 1, 13,
    0, 0, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 2, 1
];
// let testQuery: string = `SELECT ?s ?p ?o WHERE {?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o} LIMIT 100`;
// let testQuery2: string = `SELECT ?s ?p ?o WHERE {?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p <http://dbpedia.org/resource/Netherlands>. ?s ?p <http://dbpedia.org/resource/England>. ?s ?p ?o} LIMIT 100`
// let testSources: string[] = ['http://fragments.dbpedia.org/2015/en','https://www.rubensworks.net','https://ruben.verborgh.org/profile/']
// let tester = new queryTester();
// let timeSpent: number  = tester.timedQueryExecution(testQuery2, testSources);
// function call(query: string) {
//     const req = http.request(options, res => {
//     });
//     req.write('query=' + query);
//     req.end();
// }
function stopCount(hrstart) {
    // execution time simulated with setTimeout function
    let hrend = process.hrtime(hrstart);
    return hrend[0] * 1000 + hrend[1] / 1000000;
}
let trainer = new trainComunicaModel();
// const loadingComplete: Promise<boolean> = trainer.loadWatDivQueries('output/queries');
// loadingComplete.then( result => {
//     const cleanedQueries: string[][] = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
//     for (let i = 0; i<cleanedQueries.length; i++){
//         const querySubset: string[] = cleanedQueries[i];
//         querySubset.shift();
//         for (let j = 0; j <querySubset.length; j++){
//             call('SELECT' + querySubset[j]);
//             break;
//         }
//         break;
//     }
//     // const stream = trainer.executeQuery('SELECT' + cleanedQueries[1], ['http://localhost:3000/sparql'])
// }
const loadingComplete = trainer.loadWatDivQueries('output/queries');
const numSimulationsPerQuery = 10;
const numEpochs = 20;
loadingComplete.then(async (result) => {
    const cleanedQueries = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
    // const resultQuery  = await trainer.executeQuery('SELECT * WHERE {?s ?p ?o } LIMIT 100', ["output/dataset.nt"]);
    // const resultArray = [];
    const lossEpoch = [];
    for (let epoch = 0; epoch < numEpochs; epoch++) {
        const lossEpisode = [];
        for (let i = 0; i < cleanedQueries.length; i++) {
            const querySubset = [...cleanedQueries[i]];
            querySubset.shift();
            for (let j = 0; j < querySubset.length; j++) {
                // console.log(`Query ${'SELECT' + querySubset[j]}`);
                /* Execute n queries and record the results */
                for (let n = 0; n < numSimulationsPerQuery; n++) {
                    const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"]);
                }
                // const resultBindings = await bindingsStream.toArray();
                /* Train the model using the queries*/
                trainer.trainModel(trainer.masterTree.masterMap, lossEpisode);
                trainer.resetMasterTree();
                // resultArray.push(resultBindings.length);
                // await bindingsStream.on('data', (binding) => {
                //     console.log(binding.toString()); // Quick way to print bindings for testing
                // });             
            }
        }
        lossEpoch.push(sum(lossEpisode) / lossEpisode.length);
        console.log(`Epoch ${epoch}, loss: ${lossEpisode[epoch]}`);
    }
    console.log(lossEpoch);
    // console.log(resultArray);
    // const stream = trainer.executeQuery('SELECT' + cleanedQueries[1], ['http://localhost:3000/sparql'])
    function sum(arr) {
        var result = 0, n = arr.length || 0; //may use >>> 0 to ensure length is Uint32
        while (n--) {
            result += +arr[n]; // unary operator to ensure ToNumber conversion
        }
        return result;
    }
});
//# sourceMappingURL=run_comunica.js.map