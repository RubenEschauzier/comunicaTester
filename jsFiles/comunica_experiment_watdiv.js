"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("node:path");
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
        this.engine = new QueryEngine().create({
            configPath: __dirname + "/config-file.json", // Relative or absolute path 
        });
        this.queries = [];
        this.queriesEasy = [];
        this.queriesMedium = [];
        this.queriesHard = [];
        this.queriesEasyVal = [];
        this.queriesMediumVal = [];
        this.queriesHardVal = [];
    }
    async executeQuery(query, sources, planHolder, validation) {
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, { sources: sources, masterTree: this.masterTree, planHolder: planHolder, validation: validation });
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
    async validateModel(masterMap) {
        this.engine = await this.engine;
        const valResults = this.engine.validateModel(masterMap);
        return valResults;
    }
    async loadWatDivQueriesStrength(queryDir, difficulty) {
        const loadingComplete = new Promise(async (resolve, reject) => {
            try {
                // Get the files as an array
                const files = await fs.promises.readdir(queryDir);
                for (const file of files) {
                    // Get the full paths
                    const filePath = path.join(queryDir, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    if (difficulty == 'easy') {
                        this.queriesEasy.push(data);
                    }
                    if (difficulty == 'medium') {
                        this.queriesMedium.push(data);
                    }
                    if (difficulty == 'hard') {
                        this.queriesHard.push(data);
                    }
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
    async loadWatDivQueriesStrengthVal(queryDir, difficulty) {
        const loadingComplete = new Promise(async (resolve, reject) => {
            try {
                const data = fs.readFileSync(queryDir, 'utf-8');
                if (difficulty == 'easy') {
                    this.queriesEasyVal.push(data);
                }
                if (difficulty == 'medium') {
                    this.queriesMediumVal.push(data);
                }
                if (difficulty == 'hard') {
                    this.queriesHardVal.push(data);
                }
                // // Get the files as an array
                // const files = await fs.promises.readdir( queryDir );
                // for( const file of files ) {
                //     // Get the full paths
                //     const filePath = path.join( queryDir, file );    
                //     const data = fs.readFileSync(filePath,'utf8');
                //     if (difficulty=='easy'){
                //         this.queriesEasyVal.push(data);
                //     }
                //     if (difficulty=='medium'){
                //         this.queriesMediumVal.push(data);
                //     }
                //     if(difficulty=='hard'){
                //         this.queriesHardVal.push(data);
                //     }
                // }
                resolve(true);
            }
            catch (e) {
                console.error("Something went wrong.", e);
                reject();
            }
        });
        return loadingComplete;
    }
    async loadWatDivQueries(queryDir) {
        const loadingComplete = new Promise(async (resolve, reject) => {
            try {
                await this.loadWatDivQueriesStrength(queryDir + '/easy', 'easy');
                await this.loadWatDivQueriesStrength(queryDir + '/medium', 'medium');
                await this.loadWatDivQueriesStrength(queryDir + '/hard', 'hard');
                await this.loadWatDivQueriesStrengthVal(queryDir + '/validation/easy.txt', 'easy');
                await this.loadWatDivQueriesStrengthVal(queryDir + '/validation/medium.txt', 'medium');
                await this.loadWatDivQueriesStrengthVal(queryDir + '/validation/hard.txt', 'hard');
                resolve(true);
            }
            catch (e) {
                console.error("Something went wrong.", e);
                reject();
            }
        });
        return loadingComplete;
    }
    saveModel(saveString) {
        this.engine.saveModel(saveString);
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
let trainer = new trainComunicaModel();
// Training parameters
const numSimulationsPerQuery = 10;
const numEpochs = 15;
const hrTime = process.hrtime();
// Initialse moments, note that std = 1 to prevent division by 0
const runningMomentsYEasy = { N: 0, mean: 0, std: 1, M2: 1 };
const runningMomentsYMedium = { N: 0, mean: 0, std: 1, M2: 1 };
const runningMomentsYHard = { N: 0, mean: 0, std: 1, M2: 1 };
const loadingComplete = trainer.loadWatDivQueries('output');
// Start train on easy, continue further
loadingComplete.then(async (result) => {
    await trainModel('easy', runningMomentsYEasy, numEpochs, numSimulationsPerQuery);
    // // console.log("Train model done!");
    await trainModel('medium', runningMomentsYMedium, numEpochs, numSimulationsPerQuery);
    await trainModel('hard', runningMomentsYHard, numEpochs, numSimulationsPerQuery);
});
async function trainModel(difficulty, momentsY, nEpoch, nSimPerQuery) {
    let cleanedQueriesEasy = trainer.queriesEasy.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let cleanedQueriesMedium = trainer.queriesMedium.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let cleanedQueriesHard = trainer.queriesHard.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let cleanedQueriesEasyVal = trainer.queriesEasyVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let cleanedQueriesMediumVal = trainer.queriesMediumVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let cleanedQueriesHardVal = trainer.queriesHardVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
    let trainQueries = [[]];
    let valQueries = [[]];
    if (difficulty == 'easy') {
        trainQueries = [...cleanedQueriesEasy];
        valQueries = [...cleanedQueriesEasyVal];
    }
    if (difficulty == 'medium') {
        trainQueries = [...cleanedQueriesEasy, ...cleanedQueriesMedium];
        valQueries = [...cleanedQueriesEasyVal, ...cleanedQueriesMediumVal];
    }
    if (difficulty == 'hard') {
        trainQueries = [...cleanedQueriesEasy, ...cleanedQueriesMedium, ...cleanedQueriesHard];
        valQueries = [...cleanedQueriesEasyVal, ...cleanedQueriesMediumVal, ...cleanedQueriesHardVal];
    }
    const trainLoss = await trainLoop(trainQueries, valQueries, momentsY, nEpoch, nSimPerQuery, difficulty);
    return trainLoss;
}
async function trainLoop(trainQueries, valQueries, momentsY, nEpoch, nSimPerQuery, difficulty) {
    const valLoss = [];
    const valMSE = [];
    const valExecutionTime = [];
    const trainLoss = [];
    const lossTrain = [];
    for (let epoch = 0; epoch < nEpoch; epoch++) {
        const lossQuery = [];
        for (let i = 0; i < trainQueries.length; i++) {
            // console.log(`cleanedQueries ${i+1}/${cleanedQueries.length}`);
            const querySubset = [...trainQueries[i]];
            for (let j = 0; j < querySubset.length; j++) {
                /* Execute n queries and record the results */
                for (let n = 0; n < nSimPerQuery; n++) {
                    let startTime = process.hrtime();
                    const mapResults = new Map();
                    const startTimeSeconds = startTime[0] + startTime[1] / 1000000000;
                    const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults, false);
                    const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY);
                    await queryPromise;
                }
                const numEntriesQuery = trainer.masterTree.getTotalEntries();
                // Normalize the y values
                for (const key of trainer.masterTree.masterMap.keys()) {
                    const joinToNormalize = trainer.masterTree.masterMap.get(key.toString());
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime - momentsY.mean) / momentsY.std;
                }
                /* Train the model using the queries*/
                // const startTensorBeforeClean: number = tf.memory().numTensors;
                let loss = await trainer.trainModel(trainer.masterTree.masterMap, numEntriesQuery);
                // console.log(`Added ${tf.memory().numTensors-startTensorBeforeClean} Tensors after cleaning Tree After Training`);
                trainer.resetMasterTree();
                if (loss) {
                    lossQuery.push(loss);
                }
            }
        }
        trainer.saveModel('epoch' + epoch + difficulty);
        lossTrain.push(sum(lossQuery) / lossQuery.length);
        console.log(`Epoch ${epoch}, Loss: ${lossTrain[epoch]}`);
        const valMetrics = await validationLoop(valQueries, momentsY, 5);
        console.log(`Epoch ${epoch}, Val Loss ${valMetrics[0]}, Val MSE ${valMetrics[1]}, Val Execution Time ${valMetrics[2]}`);
        valLoss.push(valMetrics[0]);
        valMSE.push(valMetrics[1]);
        valExecutionTime.push(valMetrics[2]);
        trainLoss.push(sum(lossQuery) / lossQuery.length);
    }
    fs.writeFileSync(path.join(__dirname, '../trainingOutput/valLoss' + difficulty + '.txt'), JSON.stringify(valLoss));
    fs.writeFileSync(path.join(__dirname, '../trainingOutput/valMSE' + difficulty + '.txt'), JSON.stringify(valMSE));
    fs.writeFileSync(path.join(__dirname, '../trainingOutput/valExecutionTime' + difficulty + '.txt'), JSON.stringify(valExecutionTime));
    fs.writeFileSync(path.join(__dirname, '../trainingOutput/trainLoss' + difficulty + '.txt'), JSON.stringify(trainLoss));
    return lossTrain;
}
async function validationLoop(validationQueries, momentsY, numSimulationsVal) {
    const lossValidation = [];
    const actualExecutionTimeValidation = [];
    const MSEValidation = [];
    for (let i = 0; i < validationQueries.length; i++) {
        // console.log(`cleanedQueries ${i+1}/${cleanedQueries.length}`);
        const querySubset = [...validationQueries[i]];
        for (let j = 0; j < querySubset.length; j++) {
            /* Execute query and record the results */
            const unNormExecutionTime = [];
            let totalExecutionTime = 0;
            let totalMSE = 0;
            let totalLoss = 0;
            for (let k = 0; k < numSimulationsVal; k++) {
                let startTime = process.hrtime();
                const mapResults = new Map();
                const startTimeSeconds = startTime[0] + startTime[1] / 1000000000;
                const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults, true);
                const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
                await queryPromise;
                // Normalize the y values
                let executionTimeValidation = 0;
                for (const key of trainer.masterTree.masterMap.keys()) {
                    const joinToNormalize = trainer.masterTree.masterMap.get(key.toString());
                    executionTimeValidation = joinToNormalize.actualExecutionTime;
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime - momentsY.mean) / momentsY.std;
                }
                // Use unnormalized execution times to compare
                /* Validate the model using the queries, we get MSE and Loss*/
                let validationResults = await trainer.validateModel(trainer.masterTree.masterMap);
                trainer.resetMasterTree();
                totalLoss += validationResults[0];
                totalMSE += validationResults[1];
                totalExecutionTime += unNormExecutionTime[0];
            }
            lossValidation.push(totalLoss / numSimulationsPerQuery);
            MSEValidation.push(totalMSE / numSimulationsPerQuery);
            // Use unnormalized execution times to compare
            actualExecutionTimeValidation.push(totalExecutionTime / numSimulationsPerQuery);
        }
    }
    const averageValidationLoss = sum(lossValidation) / lossValidation.length;
    const averageValidationMSE = sum(MSEValidation) / MSEValidation.length;
    const averageValExecutionTime = sum(actualExecutionTimeValidation) / actualExecutionTimeValidation.length;
    /* Still include MSE!*/
    return [averageValidationLoss, averageValidationMSE, averageValExecutionTime];
}
function sum(arr) {
    var result = 0, n = arr.length || 0; //may use >>> 0 to ensure length is Uint32
    while (n--) {
        result += +arr[n]; // unary operator to ensure ToNumber conversion
    }
    return result;
}
function addEndListener(beginTime, planMap, masterMap, bindingStream, process, runningMomentsY, unNormExecutionTime) {
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
                if (unNormExecutionTime) {
                    unNormExecutionTime.push(elapsed);
                }
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
function updateRunningMoments(toUpdateAggregate, newValue) {
    toUpdateAggregate.N += 1;
    const delta = newValue - toUpdateAggregate.mean;
    toUpdateAggregate.mean += delta / toUpdateAggregate.N;
    const newDelta = newValue - toUpdateAggregate.mean;
    toUpdateAggregate.M2 += delta * newDelta;
    toUpdateAggregate.std = Math.sqrt(toUpdateAggregate.M2 / toUpdateAggregate.N);
}
//# sourceMappingURL=comunica_experiment_watdiv.js.map