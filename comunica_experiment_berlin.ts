import {MCTSJoinInformation, runningMoments, aggregateValues} from '@comunica/model-trainer';
import * as fs from 'fs'
import * as path from 'node:path'
import * as tf from '@tensorflow/tfjs-node'

class trainComunicaModel{
    public engine: any;
    public queries: string[];
    public queriesEasy: string[];
    public queriesMedium: string[];
    public queriesHard: string[];
    public queriesEasyVal: string[];
    public queriesMediumVal: string[];
    public queriesHardVal: string[];
    public loadedQueries: Promise<boolean>;
    public modelTrainer;
    public masterTree: any;
    public runningMoments: runningMoments;

    public constructor(){
        const QueryEngine = require('@comunica/query-sparql-file').QueryEngineFactory;
        this.modelTrainer = require('@comunica/model-trainer');
        this.runningMoments = {indexes: [0,7], runningStats: new Map<number, aggregateValues>()};
        for (const index of this.runningMoments.indexes){
            const startPoint: aggregateValues = {N: 0, mean: 0, std: 1, M2: 1}
            this.runningMoments.runningStats.set(index, startPoint);
        }


        this.masterTree = new this.modelTrainer.MCTSMasterTree(this.runningMoments);        
        this.engine = new QueryEngine().create({
            configPath: __dirname+"/config-file.json", // Relative or absolute path 
        });
        this.queries = [];
        this.queriesEasy=[];
        this.queriesMedium=[];
        this.queriesHard=[];
        this.queriesEasyVal=[];
        this.queriesMediumVal=[];
        this.queriesHardVal=[];
    }

    public async executeQuery(query: string, sources:string[], planHolder: Map<string, number>, validation: boolean){
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, {sources: sources, masterTree: this.masterTree, planHolder: planHolder, validation: validation});
        return bindingsStream
    }

    public async explainQuery(query:string, sources:string[]){
        const results = await this.engine.explain(query, {sources: sources, masterTree: this.masterTree});
        return results

    }

    public async trainModel(masterMap: Map<string, MCTSJoinInformation>, numEntries: number): Promise<number>{
        // this.engine.getModelHolder().getModel().layersValue[0][0].mWeights.print() 
        this.engine = await this.engine;
        const episodeLoss = this.engine.trainModel(masterMap, numEntries);
        // this.engine.getModelHolder().getModel().denseLayerValue.getWeights()[0].print();
        return episodeLoss
    }
    public async validateModel(masterMap:Map<string, MCTSJoinInformation>){
        this.engine = await this.engine;
        const valResults: number[] = this.engine.validateModel(masterMap);
        return valResults

    }


    public async loadBerlinQueriesStrength(queryDir: string, difficulty: "easy"|"medium"|"hard"){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                // Get the files as an array
                const files = await fs.promises.readdir( queryDir );
                for( const file of files ) {
                    // Get the full paths
                    const filePath = path.join( queryDir, file );    
                    const data = fs.readFileSync(filePath,'utf8');
                    if (difficulty=='easy'){
                        this.queriesEasy.push(data);
                    }
                    if (difficulty=='medium'){
                        this.queriesMedium.push(data);
                    }
                    if(difficulty=='hard'){
                        this.queriesHard.push(data);
                    }
                }
                resolve(true); 
            }
            catch( e ) {
                console.error( "Something went wrong.", e );
                reject();
            }
        });
        return loadingComplete;
    }

    public async loadBerlinQueriesStrengthVal(queryDir: string, difficulty: "easy"|"medium"|"hard"){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                const files = await fs.promises.readdir( queryDir );
                for( const file of files ) {
                    // Get the full paths
                    const filePath = path.join( queryDir, file );    
                
                    const data = fs.readFileSync(filePath, 'utf-8')
                    if (difficulty=='easy'){
                        this.queriesEasyVal.push(data);
                    }
                    if (difficulty=='medium'){
                        this.queriesMediumVal.push(data);
                    }
                    if(difficulty=='hard'){
                        this.queriesHardVal.push(data);
                    }
                    resolve(true); 
                }
            }
            catch( e ) {
                console.error( "Something went wrong.", e );
                reject();
            }
        });
        return loadingComplete;
    }

    public async loadWatDivQueries(queryDir: string){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                await this.loadBerlinQueriesStrength(queryDir+'/easy', 'easy');
                await this.loadBerlinQueriesStrength(queryDir+'/medium', 'medium');
                await this.loadBerlinQueriesStrength(queryDir+'/hard', 'hard');
                await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/easy', 'easy');
                await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/medium', 'medium');
                await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/hard', 'hard');
                resolve(true); 
            }
            catch( e ) {
                console.error( "Something went wrong.", e );
                reject();
            }
        });
        return loadingComplete;
    }
    public saveModel(saveString: string, runningMomentsX: aggregateValues, runningMomentsY: aggregateValues){
        this.engine.saveModel(saveString, runningMomentsX, runningMomentsY);
    }

    public resetMasterTree(){
        this.masterTree = new this.modelTrainer.MCTSMasterTree(this.runningMoments);
    }

    public async awaitEngine(){
        this.engine = await this.engine
    }

}


let trainer: trainComunicaModel = new trainComunicaModel();



// Training parameters
const numSimulationsPerQuery: number = 10;
const numEpochs: number = 15;
const numEpochsHard: number = 10;
const numSimsQueryHard: number = 10
const hrTime = process.hrtime();
// Initialse moments, note that std = 1 to prevent division by 0
const runningMomentsYEasy: aggregateValues = {N: 0, mean: 0, std: 1, M2: 1};
const runningMomentsYMedium: aggregateValues = {N: 0, mean: 0, std: 1, M2: 1};
const runningMomentsYHard: aggregateValues = {N: 0, mean: 0, std: 1, M2: 1};

const loadingComplete: Promise<boolean> = trainer.loadWatDivQueries('queriesBerlinSmall');
// Start train on easy, continue further
loadingComplete.then(async result => {
    await trainModel('easy', runningMomentsYEasy, numEpochs, numSimulationsPerQuery);
    await trainModel('medium', runningMomentsYMedium, numEpochs, numSimulationsPerQuery);
    await trainModel('hard', runningMomentsYHard, numEpochs, numSimulationsPerQuery)
})

async function trainModel(difficulty: "easy"|"medium"|"hard", momentsY: aggregateValues, nEpoch: number, nSimPerQuery: number){

    let cleanedQueriesEasy:string[][] = trainer.queriesEasy.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1))
    let cleanedQueriesMedium:string[][] = trainer.queriesMedium.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1))
    let cleanedQueriesHard:string[][] = trainer.queriesHard.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1))

    let cleanedQueriesEasyVal:string[][] = trainer.queriesEasyVal.map(x=>x.split('[sep]').slice(1));
    let cleanedQueriesMediumVal:string[][] = trainer.queriesMediumVal.map(x=>x.split('[sep]').slice(1));
    let cleanedQueriesHardVal:string[][] = trainer.queriesHardVal.map(x=>x.split('[sep]').slice(1));

    
    let trainQueries: string[][] = [[]];
    let valQueries: string[][] = [[]]
    if (difficulty=='easy'){
        trainQueries = [...cleanedQueriesEasy];
        valQueries = [... cleanedQueriesEasyVal]
    }
    if (difficulty=='medium'){
        trainQueries = [...cleanedQueriesEasy, ...cleanedQueriesMedium ];
        valQueries = [...cleanedQueriesEasyVal, ...cleanedQueriesMediumVal ];
    }
    if(difficulty=='hard'){
        trainQueries = [...cleanedQueriesEasy, ...cleanedQueriesMedium, ...cleanedQueriesHard];
        valQueries = [...cleanedQueriesEasyVal, ...cleanedQueriesMediumVal, ...cleanedQueriesHardVal];
    }
    let trainLoss: number[] = [];
    if (difficulty=='hard'){
        trainLoss = await trainLoop(trainQueries, valQueries, momentsY, numEpochsHard, numSimsQueryHard, difficulty);
    }
    else{
        trainLoss = await trainLoop(trainQueries, valQueries, momentsY, nEpoch, nSimPerQuery, difficulty);
    }
    return trainLoss
}
async function trainLoop(trainQueries: string[][], valQueries: string[][], momentsY: aggregateValues, nEpochPassed: number, nSimPerQuery: number, 
    difficulty: 'easy'|'medium'|'hard'){
    const valLoss: number[] = [];
    const valMSE: number[] = [];
    const valExecutionTime: number[] = [];
    const trainLoss: number[] = [];
    const lossTrain: number[] = [];
    // Warm up running moments
    for (let i = 0; i<trainQueries.length; i++){
        console.log(`Warm-up query ${i+1}/${trainQueries.length}`);
        const querySubset: string[] = [... trainQueries[i]];
        for (let j = 0; j <querySubset.length; j++){
            const unNormExecutionTime: number[] = [];
            for (let k = 0; k<5;k++){
                let startTime = process.hrtime();
                const mapResults = new Map()
                const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;

                const bindingsStream = await trainer.executeQuery(querySubset[j], ["queriesBerlinSmall/dataset.nt"], mapResults, true);
                const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
                await queryPromise;    

                trainer.resetMasterTree();
            }
        }
    }
    console.log("Finished warming up the running moments");
    console.log(trainer.runningMoments);
    console.log(momentsY);
    console.log(`Difficulty: ${difficulty}`);
    console.log(`We train ${nEpochPassed} epochs, perform ${nSimPerQuery} query sims and train on ${trainQueries.length} query types`)

    // Warm up query
    const mapResultsTemp = new Map()
    const bindingsStream = await trainer.executeQuery([...trainQueries[0]][0], ["queriesBerlinSmall/dataset.nt"], mapResultsTemp, true);
    trainer.resetMasterTree();
    for (let epoch = 0; epoch<nEpochPassed; epoch++){
        const lossQuery: number[] = []
        for (let i = 0; i<trainQueries.length; i++){
            console.log(`Query of ${difficulty}: ${i+1}/${trainQueries.length}`);
            console.dir(trainQueries[i][0],{'maxArrayLength': null})
            const querySubset: string[] = [... trainQueries[i]];
            for (let j = 0; j <querySubset.length; j++){
                /* Execute n queries and record the results */
                for (let n = 0; n < nSimPerQuery; n++){
                    let startTime = process.hrtime();
                    const mapResults = new Map()
                    const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;
                    const bindingsStream = await trainer.executeQuery(querySubset[j], ["queriesBerlinSmall/dataset.nt"], mapResults, false);
                    const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY);
                    await queryPromise;

                }
                const numEntriesQuery: number = trainer.masterTree.getTotalEntries();
                // Normalize the y values
                for (const key of trainer.masterTree.masterMap.keys()){
                    const joinToNormalize: MCTSJoinInformation = trainer.masterTree.masterMap.get(key.toString());
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime! - momentsY.mean)/momentsY.std;
                }

                /* Train the model using the queries*/
                // const startTensorBeforeClean: number = tf.memory().numTensors;
    
                let loss: number = await trainer.trainModel(trainer.masterTree.masterMap, numEntriesQuery);

                // console.log(`Added ${tf.memory().numTensors-startTensorBeforeClean} Tensors after cleaning Tree After Training`);

                trainer.resetMasterTree();
                if (loss){
                    lossQuery.push(loss);
                }
            }

        
        }
        trainer.saveModel('epochBerlin'+epoch+difficulty, trainer.masterTree.runningMoments, momentsY);
        lossTrain.push(sum(lossQuery)/lossQuery.length);
        console.log(`Epoch ${epoch}, Loss: ${lossTrain[epoch]}`);
        const valMetrics = await validationLoop(valQueries, momentsY, 5);
        console.log(`Epoch ${epoch}, Val Loss ${valMetrics[0]}, Val MSE ${valMetrics[1]}, Val Execution Time ${valMetrics[2]}`);
        valLoss.push(valMetrics[0]); valMSE.push(valMetrics[1]); valExecutionTime.push(valMetrics[2]); trainLoss.push(sum(lossQuery)/lossQuery.length);
    }
    fs.writeFileSync(path.join(__dirname, '../trainingOutputBerlin/valLoss'+difficulty+'.txt'), JSON.stringify(valLoss));
    fs.writeFileSync(path.join(__dirname, '../trainingOutputBerlin/valMSE'+difficulty+'.txt'), JSON.stringify(valMSE));
    fs.writeFileSync(path.join(__dirname, '../trainingOutputBerlin/valExecutionTime'+difficulty+'.txt'), JSON.stringify(valExecutionTime));
    fs.writeFileSync(path.join(__dirname, '../trainingOutputBerlin/trainLoss'+difficulty+'.txt'), JSON.stringify(trainLoss));
    console.log("Wrote file!");
    return lossTrain;
}

async function validationLoop(validationQueries: string[][], momentsY: aggregateValues, numSimulationsVal: number){
    const lossValidation: number[] = []
    const actualExecutionTimeValidation: number[] = [];
    const MSEValidation: number[] = [];
    for (let i = 0; i<validationQueries.length; i++){
        console.log(`Validation Queries ${i+1}/${validationQueries.length}`);
        const querySubset: string[] = [... validationQueries[i]];
        for (let j = 0; j <querySubset.length; j++){
            /* Execute query and record the results */
            const unNormExecutionTime: number[] =[];
            let totalExecutionTime: number = 0;
            let totalMSE: number = 0;
            let totalLoss: number = 0;
            for (let k = 0; k<numSimulationsVal;k++){
                let startTime = process.hrtime();
                const mapResults = new Map()
                const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;
                const bindingsStream = await trainer.executeQuery(querySubset[j], ["queriesBerlinSmall/dataset.nt"], mapResults, true);
                const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
                await queryPromise;
                
                // Normalize the y values
                let executionTimeValidation: number = 0;
                for (const key of trainer.masterTree.masterMap.keys()){
                    const joinToNormalize: MCTSJoinInformation = trainer.masterTree.masterMap.get(key.toString());
                    executionTimeValidation = joinToNormalize.actualExecutionTime!;
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime! - momentsY.mean)/momentsY.std;
                }
                // Use unnormalized execution times to compare

                /* Validate the model using the queries, we get MSE and Loss*/
                let validationResults: number[] = await trainer.validateModel(trainer.masterTree.masterMap);
                trainer.resetMasterTree();
                totalLoss+=validationResults[0];
                totalMSE+=validationResults[1];
                totalExecutionTime+=unNormExecutionTime[0]
    
            }
            lossValidation.push(totalLoss/numSimulationsVal);
            MSEValidation.push(totalMSE/numSimulationsVal);
            // Use unnormalized execution times to compare
            actualExecutionTimeValidation.push(totalExecutionTime/numSimulationsVal);

        }
    }
    const averageValidationLoss = sum(lossValidation)/lossValidation.length;
    const averageValidationMSE = sum(MSEValidation)/MSEValidation.length;
    const averageValExecutionTime = sum(actualExecutionTimeValidation)/actualExecutionTimeValidation.length;
    /* Still include MSE!*/
    return [averageValidationLoss, averageValidationMSE, averageValExecutionTime]
}

function sum(arr: number[]) {
    var result = 0, n = arr.length || 0; //may use >>> 0 to ensure length is Uint32
    while(n--) {
      result += +arr[n]; // unary operator to ensure ToNumber conversion
    }
    return result;
}

function addEndListener(beginTime: number, planMap: Map<string, number>, masterMap: Map<string, MCTSJoinInformation>, 
    bindingStream: any, process: any, runningMomentsY: aggregateValues, unNormExecutionTime?: number[]): Promise<boolean>{
    /**
     * Function that consumes the binding stream and measures elapsed time
     */
    const joinPlanQuery: string = Array.from(planMap)[planMap.size-1][0];
    let numEntriesPassed: number = 0;
    const finishedReading: Promise<boolean> = new Promise((resolve, reject) => {
        if (!masterMap.get(joinPlanQuery)!.actualExecutionTime || masterMap.get(joinPlanQuery)!.actualExecutionTime == 0){
            bindingStream.on('data', (binding: any) => {
                numEntriesPassed += 1
                // console.log(`Entry Number:${numEntriesPassed}`)
            });
            
            bindingStream.on('end', () => {
                const end: number[] = process.hrtime();
                const endSeconds: number = end[0] + end[1] / 1000000000;
                const elapsed: number = endSeconds-beginTime;
                if (unNormExecutionTime){
                    unNormExecutionTime.push(elapsed);
                }
                // console.log(`We have ${numEntriesPassed} Entries`)
                // Update the running moments
                updateRunningMoments(runningMomentsY, elapsed);
                // Update the standardized execution time for each joinPlan
                planMap.forEach((value, key) => {
                    const joinInformationPrev = masterMap.get(key.toString())! 
                    joinInformationPrev.actualExecutionTime = elapsed;
                    masterMap.set(key.toString(), joinInformationPrev);
                })
                // console.log(`Elapsed time ${elapsed}`);
                // console.log(masterMap);
                resolve(true);
            })    
    }});
    return finishedReading;
}

function updateRunningMoments(toUpdateAggregate: aggregateValues, newValue: number){
    toUpdateAggregate.N +=1;
    const delta = newValue - toUpdateAggregate.mean; 
    toUpdateAggregate.mean += delta / toUpdateAggregate.N;
    const newDelta = newValue - toUpdateAggregate.mean;
    toUpdateAggregate.M2 += delta * newDelta;
    toUpdateAggregate.std = Math.sqrt(toUpdateAggregate.M2 / toUpdateAggregate.N);
}
