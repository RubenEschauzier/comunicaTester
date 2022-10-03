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
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
        this.runningMeanStd = [[0, 0], [0, 0]];
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
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
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
const loadingComplete = trainer.loadWatDivQueries('output/queries');
const numSimulationsPerQuery = 20;
const numEpochs = 1000;
const hrTime = process.hrtime();
let numCompleted = 0;
async function executeQuery(beginTime, bindingStream, planMap, masterMap) {
    let numEntriesPassed = 0;
    let elapsed = 0;
    const joinPlanQuery = Array.from(planMap)[planMap.size - 1][0];
    const finishedReading = new Promise((resolve, reject) => {
        bindingStream.on('data', (binding) => {
            numEntriesPassed += 1;
            console.log(`${numEntriesPassed}`);
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
            console.log(`Elapsed time ${elapsed}`);
            resolve(true);
        });
    });
    await finishedReading;
    return elapsed;
}
function addEndListener(beginTime, planMap, masterMap, bindingStream, process) {
    const joinPlanQuery = Array.from(planMap)[planMap.size - 1][0];
    let numEntriesPassed = 0;
    const finishedReading = new Promise((resolve, reject) => {
        if (!masterMap.get(joinPlanQuery).actualExecutionTime || masterMap.get(joinPlanQuery).actualExecutionTime == 0) {
            bindingStream.on('data', (binding) => {
                numEntriesPassed += 1;
                console.log(`${numEntriesPassed}`);
            });
            bindingStream.on('end', () => {
                const end = process.hrtime();
                const endSeconds = end[0] + end[1] / 1000000000;
                console.log(beginTime);
                const elapsed = endSeconds - beginTime;
                // planMap.forEach((value, key, map) => map.set(key, elapsed))
                // Update the execution time for each joinPlan
                planMap.forEach((value, key) => {
                    const joinInformationPrev = masterMap.get(key.toString());
                    joinInformationPrev.actualExecutionTime = elapsed;
                    masterMap.set(key.toString(), joinInformationPrev);
                });
                console.log(`Elapsed time ${elapsed}`);
                // console.log(masterMap);
                numCompleted += 1;
                resolve(true);
            });
        }
    });
    return finishedReading;
    // // Ensure we have our joinplan in the masterMap, this should always be true
    // if (masterMap.get(joinPlanQuery)){
    //     // We don't execute the query if we already recorded an execution time for this query during this epoch, this is to save time.
    //     // console.log(masterMap.get(joinPlanQuery));
    //     if (!masterMap.get(joinPlanQuery)!.actualExecutionTime || masterMap.get(joinPlanQuery)!.actualExecutionTime == 0){
    //         bindingStream.on('data', (binding: any) => {
    //             numEntriesPassed += 1
    //             console.log(`${numEntriesPassed}`)
    //         });
    //         bindingStream.on('end', () => {
    //             console.log("End")
    //             const end: number[] = process.hrtime();
    //             const endSeconds: number = end[0] + end[1] / 1000000000;
    //             const elapsed: number = endSeconds-beginTime;
    //             // planMap.forEach((value, key, map) => map.set(key, elapsed))
    //             // Update the execution time for each joinPlan
    //             planMap.forEach((value, key) => {const joinInformationPrev = masterMap.get(joinPlanQuery)! 
    //                 joinInformationPrev.actualExecutionTime = elapsed;
    //                 masterMap.set(joinPlanQuery, joinInformationPrev);
    //             })
    //             console.log(`Elapsed time ${elapsed}`);
    //             numCompleted += 1;
    //             finishedReading.resolve()
    //         })    
    //     }
    //     else{
    //         numCompleted += 1;
    //     }    
    // }
}
loadingComplete.then(async (result) => {
    let cleanedQueries = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
    // const resultQuery  = await trainer.executeQuery('SELECT * WHERE {?s ?p ?o } LIMIT 100', ["output/dataset.nt"]);
    // const resultArray = [];
    // // Perform one query to index the database into comunica 
    // const bindingsStream = await trainer.executeQuery('SELECT' + cleanedQueries[0][0], ["output/dataset.nt"]);
    // HERE WE TEMPORARILY RESTRICT OUR QUERY TO TEST
    await trainer.awaitEngine();
    cleanedQueries = [cleanedQueries[7]];
    const lossEpoch = [];
    for (let epoch = 0; epoch < numEpochs; epoch++) {
        const lossEpisode = [];
        for (let i = 0; i < cleanedQueries.length; i++) {
            // console.log(`cleanedQueries ${i+1}/${cleanedQueries.length}`);
            const querySubset = [...cleanedQueries[i]];
            querySubset.shift();
            for (let j = 0; j < querySubset.length; j++) {
                // console.log(`Query ${'SELECT' + querySubset[j]}`);
                /* Execute n queries and record the results */
                const queryPromises = [];
                for (let n = 0; n < numSimulationsPerQuery; n++) {
                    let startTime = process.hrtime();
                    const startTimeSeconds = startTime[0] + startTime[1] / 1000000000;
                    const mapResults = new Map();
                    const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults);
                    // queryPromises.push(addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process));
                    // const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process);
                    // await queryPromise;
                }
                const numEntriesQuery = trainer.masterTree.getTotalEntries();
                const tempMasterMap = trainer.masterTree.masterMap;
                // for (const value of tempMasterMap.values()){
                //     console.log(value.featureMatrix);
                // }
                // tempMasterMap.forEach( (value, key) => {console.log(value.featureMatrix)});
                // Wait for all query executions to finish
                // await Promise.all(queryPromises);
                // const resultBindings = await bindingsStream.toArray();
                // Wait for all queries in the episode to finish 
                // while (numCompleted < numSimulationsPerQuery){
                //     continue;
                // }
                /* Train the model using the queries*/
                let loss = await trainer.trainModel(trainer.masterTree.masterMap, numEntriesQuery);
                trainer.resetMasterTree();
                if (loss) {
                    lossEpisode.push(loss);
                }
                numCompleted = 0;
                break;
                // resultArray.push(resultBindings.length);
                // await bindingsStream.on('data', (binding) => {
                //     console.log(binding.toString()); // Quick way to print bindings for testing
                // });             
            }
            break;
        }
        lossEpoch.push(sum(lossEpisode) / lossEpisode.length);
        console.log(`Epoch ${epoch}, loss: ${lossEpoch[epoch]}`);
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