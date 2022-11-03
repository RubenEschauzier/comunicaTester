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
class trainComunicaModel {
    constructor() {
        const QueryEngine = require('@comunica/query-sparql-file').QueryEngineFactory;
        this.modelTrainer = require('@comunica/model-trainer');
        this.runningMoments = { indexes: [0, 7], runningStats: new Map() };
        for (const index of this.runningMoments.indexes) {
            const startPoint = { N: 0, mean: 0, std: 1, M2: 1 };
            this.runningMoments.runningStats.set(index, startPoint);
        }
        this.masterTree = new this.modelTrainer.MCTSMasterTree(this.runningMoments);
        // Only standardise index 0: cardinality, index 7: number of variables in join
        this.engine = new QueryEngine().create({
            configPath: __dirname + "/config-file.json", // Relative or absolute path 
        });
        this.queries = [];
    }
    async executeQuery(query, sources, planHolder) {
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, { sources: sources, masterTree: this.masterTree, planHolder: planHolder });
        return bindingsStream;
    }
    async explainQuery(query, sources) {
        const results = await this.engine.explain(query, { sources: sources, masterTree: this.masterTree });
        return results;
    }
    async trainModel(masterMap, numEntries) {
        // this.engine.getModelHolder().getModel().layersValue[0][0].mWeights.print() 
        this.engine = await this.engine;
        const episodeLoss = this.engine.trainModel(masterMap, numEntries);
        // this.engine.getModelHolder().getModel().denseLayerValue.getWeights()[0].print();
        return episodeLoss;
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
        this.masterTree = new this.modelTrainer.MCTSMasterTree(this.runningMoments);
    }
    async awaitEngine() {
        this.engine = await this.engine;
    }
}
const nResults = [
    0, 0, 0, 0, 4374, 4374, 0, 0, 1,
    0, 0, 0, 0, 0, 33, 33, 3, 3,
    1, 1, 60, 34, 0, 0, 2, 1, 13,
    0, 0, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 2, 1
];
function stopCount(hrstart) {
    // execution time simulated with setTimeout function
    let hrend = process.hrtime(hrstart);
    return hrend[0] * 1000 + hrend[1] / 1000000;
}
let trainer = new trainComunicaModel();
const loadingComplete = trainer.loadWatDivQueries('trainingData/queriesEasy');
// Training parameters
const numSimulationsPerQuery = 10;
const numEpochs = 100;
const hrTime = process.hrtime();
// Initialse moments, note that std = 1 to prevent division by 0
const runningMomentsY = { N: 0, mean: 0, std: 1, M2: 1 };
loadingComplete.then(async (result) => {
    let cleanedQueries = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
    // const resultQuery  = await trainer.executeQuery('SELECT * WHERE {?s ?p ?o } LIMIT 100', ["output/dataset.nt"]);
    // const resultArray = [];
    // // Perform one query to index the database into comunica 
    // const bindingsStream = await trainer.executeQuery('SELECT' + cleanedQueries[0][0], ["output/dataset.nt"]);
    // HERE WE TEMPORARILY RESTRICT OUR QUERY TO TEST
    await trainer.awaitEngine();
    // cleanedQueries = cleanedQueries.slice(12,17)
    // cleanedQueries = cleanedQueries.slice(0,1);
    console.log(cleanedQueries);
    const lossEpoch = [];
    for (let epoch = 0; epoch < numEpochs; epoch++) {
        const lossEpisode = [];
        for (let i = 0; i < cleanedQueries.length; i++) {
            // console.log(`cleanedQueries ${i+1}/${cleanedQueries.length}`);
            const querySubset = [...cleanedQueries[i]];
            querySubset.shift();
            for (let j = 0; j < querySubset.length; j++) {
                /* Execute n queries and record the results */
                for (let n = 0; n < numSimulationsPerQuery; n++) {
                    let startTime = process.hrtime();
                    const startTimeSeconds = startTime[0] + startTime[1] / 1000000000;
                    const mapResults = new Map();
                    const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults);
                    // queryPromises.push(addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process));
                    const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, runningMomentsY);
                    await queryPromise;
                }
                const numEntriesQuery = trainer.masterTree.getTotalEntries();
                // Normalize the y values
                // console.log("Running Moments");
                // console.log(runningMomentsY.mean);
                // console.log(runningMomentsY.std);
                for (const key of trainer.masterTree.masterMap.keys()) {
                    const joinToNormalize = trainer.masterTree.masterMap.get(key.toString());
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime - runningMomentsY.mean) / runningMomentsY.std;
                }
                /* Train the model using the queries*/
                let loss = await trainer.trainModel(trainer.masterTree.masterMap, numEntriesQuery);
                trainer.resetMasterTree();
                if (loss) {
                    lossEpisode.push(loss);
                }
            }
        }
        lossEpoch.push(sum(lossEpisode) / lossEpisode.length);
        console.log(`Epoch ${epoch}, loss: ${lossEpoch[epoch]}`);
    }
    console.log(lossEpoch);
    // console.log(resultArray);
    // const stream = trainer.executeQuery('SELECT' + cleanedQueries[1], ['http://localhost:3000/sparql'])
});
function sum(arr) {
    var result = 0, n = arr.length || 0; //may use >>> 0 to ensure length is Uint32
    while (n--) {
        result += +arr[n]; // unary operator to ensure ToNumber conversion
    }
    return result;
}
function addEndListener(beginTime, planMap, masterMap, bindingStream, process, runningMomentsY) {
    /**
     * Function that consumes the binding stream and measures elapsed time
     */
    const joinPlanQuery = Array.from(planMap)[planMap.size - 1][0];
    let numEntriesPassed = 0;
    const finishedReading = new Promise((resolve, reject) => {
        if (!masterMap.get(joinPlanQuery).actualExecutionTime || masterMap.get(joinPlanQuery).actualExecutionTime == 0) {
            bindingStream.on('data', (binding) => {
                numEntriesPassed += 1;
                // console.log(`Entry Number:${numEntriesPassed}`)
            });
            bindingStream.on('end', () => {
                const end = process.hrtime();
                const endSeconds = end[0] + end[1] / 1000000000;
                const elapsed = endSeconds - beginTime;
                // Update the running moments
                updateRunningMoments(runningMomentsY, elapsed);
                // Update the standardized execution time for each joinPlan
                planMap.forEach((value, key) => {
                    const joinInformationPrev = masterMap.get(key.toString());
                    joinInformationPrev.actualExecutionTime = elapsed;
                    masterMap.set(key.toString(), joinInformationPrev);
                });
                // console.log(`Elapsed time ${elapsed}`);
                // console.log(masterMap);
                resolve(true);
            });
        }
    });
    return finishedReading;
}
async function executeQuery(beginTime, bindingStream, planMap, masterMap) {
    let numEntriesPassed = 0;
    let elapsed = 0;
    const joinPlanQuery = Array.from(planMap)[planMap.size - 1][0];
    const finishedReading = new Promise((resolve, reject) => {
        bindingStream.on('data', (binding) => {
            numEntriesPassed += 1;
            // console.log(`${numEntriesPassed}`)
        });
        bindingStream.on('end', () => {
            const end = process.hrtime();
            const endSeconds = end[0] + end[1] / 1000000000;
            elapsed = endSeconds - beginTime;
            // Update the execution time for each joinPlan
            planMap.forEach((value, key) => {
                const joinInformationPrev = masterMap.get(joinPlanQuery);
                joinInformationPrev.actualExecutionTime = elapsed;
                masterMap.set(joinPlanQuery, joinInformationPrev);
            });
            // console.log(`Elapsed time ${elapsed}`);
            resolve(true);
        });
    });
    await finishedReading;
    return elapsed;
}
function updateRunningMoments(toUpdateAggregate, newValue) {
    toUpdateAggregate.N += 1;
    const delta = newValue - toUpdateAggregate.mean;
    toUpdateAggregate.mean += delta / toUpdateAggregate.N;
    const newDelta = newValue - toUpdateAggregate.mean;
    toUpdateAggregate.M2 += delta * newDelta;
    toUpdateAggregate.std = Math.sqrt(toUpdateAggregate.M2 / toUpdateAggregate.N);
}
// public async processLineByLine(vectorLocation: string) {
//     const fileStream = fs.createReadStream(vectorLocation);
//     const rl = readline.createInterface({
//       input: fileStream,
//       crlfDelay: Infinity
//     });
//     for await (const line of rl) {
//       // Each line in input.txt will be successively available here as `line`.
//       console.log("Start reading");
//       const entityVector = line.split(/ (.*)/s);
//       const entity = entityVector[0]
//       const vectorRepresentation = entityVector[1].trim().split(" ").map(Number);
//       console.log(entity)
//       console.log(vectorRepresentation)
//       this.graphVectors.set(entity, vectorRepresentation);
//     }
//   }
//   public async loadGraphVectors(){
//     const vectorLocation = path.join(__dirname, "..", "..", "/actor-rdf-join-inner-multi-reinforcement-learning/model/vectors.txt");
//     this.graphVectors = new Map();
//     // const vectors = JSON.parse(readFileSync(vectorLocation, 'utf8'));
//     await this.processLineByLine(vectorLocation);
//   }
//# sourceMappingURL=run_comunica.js.map