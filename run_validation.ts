import {MCTSJoinInformation, runningMoments, aggregateValues} from '@comunica/model-trainer';
import * as fs from 'fs'
import * as path from 'node:path'
import * as tf from '@tensorflow/tfjs-node'
import { rejects } from 'assert';

class trainComunicaModel{
    public engine: any;
    public queries: string[];
    public queriesEasyWatDivVal: string[];
    public queriesMediumWatDivVal: string[];
    public queriesHardWatDivVal: string[];
    public queriesEasyBerlinVal: string[];
    public queriesMediumBerlinVal: string[];
    public queriesHardBerlinVal: string[];

    public queriesVal: string[];

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
        this.queriesEasyWatDivVal = [];
        this.queriesMediumWatDivVal = [];
        this.queriesHardWatDivVal = [];
        this.queriesEasyBerlinVal = [];
        this.queriesMediumBerlinVal = [];
        this.queriesHardBerlinVal = [];
        this.queriesVal = [];
    }

    public async executeQuery(query: string, sources:string[], planHolder: Map<string, number>, validation: boolean){
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, {sources: sources, masterTree: this.masterTree, planHolder: planHolder, validation: validation, 
            modelLocation: 'epochBerlin4hard'});
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

    public async loadBerlinQueriesStrengthVal(queryDir: string, difficulty: "easy"|"medium"|"hard"){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                const data = fs.readFileSync(queryDir, 'utf-8')
                if (difficulty=='easy'){
                    this.queriesEasyBerlinVal.push(data);
                }
                if (difficulty=='medium'){
                    this.queriesMediumBerlinVal.push(data);
                }
                if(difficulty=='hard'){
                    this.queriesHardBerlinVal.push(data);
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

    public saveModel(saveString: string){
        this.engine.saveModel(saveString);
    }

    public resetMasterTree(){
        this.masterTree = new this.modelTrainer.MCTSMasterTree(this.runningMoments);
    }

    public async awaitEngine(){
        this.engine = await this.engine
    }

    public async loadWatDivQueriesStrengthVal(queryDir: string, difficulty: "easy"|"medium"|"hard"){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                const data = fs.readFileSync(queryDir, 'utf-8')
                if (difficulty=='easy'){
                    this.queriesEasyWatDivVal.push(data);
                }
                if (difficulty=='medium'){
                    this.queriesMediumWatDivVal.push(data);
                }
                if(difficulty=='hard'){
                    this.queriesHardWatDivVal.push(data);
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

    public async loadValQueries(queryDir: string) {
        const loadingComplete = new Promise(async (resolve, reject) => {
            try {
                const files = await fs.promises.readdir(queryDir);
                for (const file of files) {
                    // Get the full paths
                    const filePath = path.join(queryDir, file);
                    const data = fs.readFileSync(filePath, 'utf-8');
                    this.queriesVal.push(data);
                    resolve(true);
                }
            }
            catch (e) {
                console.error("Something went wrong.", e);
                reject();
            }
        });
        return loadingComplete;
    }

    public async loadQueries(queryDir: string, type: 'watdiv'|'berlin'){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                if(type=='watdiv'){
                    await this.loadWatDivQueriesStrengthVal(queryDir+'/validation/easy.txt', 'easy');
                    await this.loadWatDivQueriesStrengthVal(queryDir+'/validation/medium.txt', 'medium');
                    await this.loadWatDivQueriesStrengthVal(queryDir+'/validation/hard.txt', 'hard');    
                }
                if(type=='berlin'){
                    await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/easy.txt', 'easy');
                    await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/medium.txt', 'medium');
                    await this.loadBerlinQueriesStrengthVal(queryDir+'/validation/hard.txt', 'hard');
    
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
    public async loadQueriesVal(queryDir: string){
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try{
                await this.loadValQueries(queryDir)
                resolve(true)
            }
            catch(e){
                console.error("Something wrong I can feel it", e);
                reject();
            }
        });
        return loadingComplete
    }
}

let trainer: trainComunicaModel = new trainComunicaModel();
// const loadingCompleteVal = trainer.loadQueriesVal('output/validation');
const loadingCompleteBerlin = trainer.loadQueriesVal('queriesBerlinSmall/validationAll')
// loadingCompleteVal.then(async result => {
//     await trainer.awaitEngine();
//     await validateModel('watdiv')
// });
loadingCompleteBerlin.then(async result =>{
    await trainer.awaitEngine();
    await validateModel('berlin');
});

// const loadingCompleteWatDiv = trainer.loadQueries('output', 'watdiv');
// const loadingCompleteBerlin = trainer.loadQueries('queriesBerlin', 'berlin');

// loadingCompleteWatDiv.then(async result =>{
//     await trainer.awaitEngine();
//     validateModel('watdiv')

// })

async function validateModel(type: 'watdiv'|'berlin'){
    if (type=='watdiv'){
        const names = ['L1', 'L2', 'L5', 'S6', 'S7', 'C3', 'F3', 'F5', 'S2', 'S3', 'S4', 'S5', 'C1','C2','F1','F2','F4','S1'];
        const numSims = 10;
        const writeStream = fs.createWriteStream('validationOutputWatDiv/results.csv');
        writeStream.write(names.join(",") + "\n");

        // let cleanedQueriesEasyVal: string[][] = trainer.queriesEasyWatDivVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
        // let cleanedQueriesMediumVal: string[][] = trainer.queriesMediumWatDivVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1));
        // let cleanedQueriesHardVal: string[][] = trainer.queriesHardWatDivVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1)); 
        let cleanedValQueries: string[][] = trainer.queriesVal.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT').slice(1)); 
        // let cleanedValQueries: string[][] = [...cleanedQueriesEasyVal, ...cleanedQueriesMediumVal, ...cleanedQueriesHardVal]
        const runningMoments: aggregateValues = {N: 7206, mean: 14.18043, std: 34.5460, M2: 8599808.649563214};
        const validationResults: number[][] = await validationLoop(cleanedValQueries, 15, runningMoments)


        writeStream.write('[ "' + validationResults[0].join('","') + '" ]\n');
        writeStream.write('[ "' + validationResults[1].join('","') + '" ]\n');
        writeStream.write('[ "' + validationResults[2].join('","') + '" ]\n');


    }
    if (type=='berlin'){
        // let cleanedQueriesEasyVal:string[][] = trainer.queriesEasyBerlinVal.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1));
        // let cleanedQueriesMediumVal:string[][] = trainer.queriesMediumBerlinVal.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1));
        // let cleanedQueriesHardVal:string[][] = trainer.queriesHardBerlinVal.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1));
        let valQueriesBerlin: string[][] = trainer.queriesVal.map(x=>x.replace(/\n/g, '').replace(/\t/g, '').split('[sep]').slice(1));
        const runningMoments: aggregateValues = {N: 2165, mean: 10.82, std: 12.03, M2: 313265.57};

        const validationResults: number[][] = await validationLoopBerlin(valQueriesBerlin, 15, runningMoments)
        const writeStream = fs.createWriteStream('validationOutputWatDiv/results.csv');
        writeStream.write('[ "' + validationResults[0].join('","') + '" ]\n');
        writeStream.write('[ "' + validationResults[1].join('","') + '" ]\n');
        writeStream.write('[ "' + validationResults[2].join('","') + '" ]\n');


    }
}
async function validationLoop(cleanedQueries: string[][], numSims: number, momentsY: aggregateValues){
    // Warm up running moments
    // for (let i = 0; i<cleanedQueries.length; i++){
    //     const querySubset: string[] = [... cleanedQueries[i]];
    //     for (let j = 0; j <querySubset.length; j++){
    //         const unNormExecutionTime: number[] = [];
    //         for (let k = 0; k<5;k++){
    //             let startTime = process.hrtime();
    //             const mapResults = new Map()
    //             const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;

    //             const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults, true);
    //             const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
    //             await queryPromise;    

    //             trainer.resetMasterTree();
    //         }
    //     }
    // }
    // console.log("Finished warming up the running moments");
    // console.log(trainer.runningMoments);
    // console.log(momentsY);
    const mapResultsTemp = new Map()
    const bindingsStream = await trainer.executeQuery('SELECT' + cleanedQueries[0][0], ["output/dataset.nt"], mapResultsTemp, true);
    trainer.resetMasterTree();

    const lossValidationPerQueryType: number[] = [];
    const totalExecutionTimePerQueryType: number[] = [];
    const searchTimePerQueryType: number[] = [];

    for (let i = 0; i<cleanedQueries.length; i++){
        let totalLossQueryType = 0;
        let totalExecutionTimeQueryType = 0;
        let totalSearchTimeQueryType = 0;
        const querySubset: string[] = [... cleanedQueries[i]];
        for (let j = 0; j <querySubset.length; j++){
            /* Execute query and record the results */
            const unNormExecutionTime: number[] =[];
            for (let k = 0; k<numSims;k++){
                let startTime = process.hrtime();
                const mapResults = new Map()
                const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;
                const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults, true);
                const endTimeSearch: number = process.hrtime()[0] + process.hrtime()[1] / 1000000000;
                const searchTime: number = endTimeSearch - startTimeSeconds;
                const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
                await queryPromise;
                
                // Normalize the y values
                let executionTimeValidation: number = 0;
                for (const key of trainer.masterTree.masterMap.keys()){
                    const joinToNormalize: MCTSJoinInformation = trainer.masterTree.masterMap.get(key.toString());
                    executionTimeValidation = joinToNormalize.actualExecutionTime!;
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime! - momentsY.mean)/momentsY.std;
                }

                /* Validate the model using the queries, we get MSE and Loss*/
                let validationResults: number[] = await trainer.validateModel(trainer.masterTree.masterMap);
                trainer.resetMasterTree();

                totalLossQueryType += validationResults[0];
                totalExecutionTimeQueryType+=unNormExecutionTime[0];
                totalSearchTimeQueryType += searchTime;
            }
            break
        }
        lossValidationPerQueryType.push(totalLossQueryType/(querySubset.length*numSims));
        totalExecutionTimePerQueryType.push(totalExecutionTimeQueryType/(querySubset.length*numSims));
        searchTimePerQueryType.push(totalSearchTimeQueryType/(querySubset.length*numSims));
    }
    /* Still include MSE!*/
    console.log(lossValidationPerQueryType)
    console.log(totalExecutionTimePerQueryType)
    console.log(searchTimePerQueryType)
    return [lossValidationPerQueryType, totalExecutionTimePerQueryType, searchTimePerQueryType];
}

async function validationLoopBerlin(cleanedQueries: string[][], numSims: number, momentsY: aggregateValues){
    const mapResultsTemp = new Map()
    const bindingsStream = await trainer.executeQuery(cleanedQueries[0][0], ["queriesBerlinSmall/dataset.nt"], mapResultsTemp, true);
    trainer.resetMasterTree();
    console.log("Finished warm-up call")


    const lossValidationPerQueryType: number[] = [];
    const totalExecutionTimePerQueryType: number[] = [];
    const searchTimePerQueryType: number[] = [];

    for (let i = 0; i<cleanedQueries.length; i++){
        let totalLossQueryType = 0;
        let totalExecutionTimeQueryType = 0;
        let totalSearchTimeQueryType = 0;
        const querySubset: string[] = [... cleanedQueries[i]];
        console.log(`Validation Queries ${i+1}/${cleanedQueries.length}`);

        for (let j = 0; j <querySubset.length; j++){
            /* Execute query and record the results */
            const unNormExecutionTime: number[] =[];
            for (let k = 0; k<numSims;k++){
                let startTime = process.hrtime();
                const mapResults = new Map()
                const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;
                const bindingsStream = await trainer.executeQuery(querySubset[j], ["queriesBerlinSmall/dataset.nt"], mapResults, true);
                const endTimeSearch: number = process.hrtime()[0] + process.hrtime()[1] / 1000000000;
                const searchTime: number = endTimeSearch - startTimeSeconds;
                const queryPromise = addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process, momentsY, unNormExecutionTime);
                await queryPromise;
                
                // Normalize the y values
                let executionTimeValidation: number = 0;
                for (const key of trainer.masterTree.masterMap.keys()){
                    const joinToNormalize: MCTSJoinInformation = trainer.masterTree.masterMap.get(key.toString());
                    executionTimeValidation = joinToNormalize.actualExecutionTime!;
                    joinToNormalize.actualExecutionTime = (joinToNormalize.actualExecutionTime! - momentsY.mean)/momentsY.std;
                }

                /* Validate the model using the queries, we get MSE and Loss*/
                let validationResults: number[] = await trainer.validateModel(trainer.masterTree.masterMap);
                trainer.resetMasterTree();

                totalLossQueryType += validationResults[0];
                totalExecutionTimeQueryType+=unNormExecutionTime[0];
                totalSearchTimeQueryType += searchTime;
            }
            break
        }
        lossValidationPerQueryType.push(totalLossQueryType/(querySubset.length*numSims));
        totalExecutionTimePerQueryType.push(totalExecutionTimeQueryType/(querySubset.length*numSims));
        searchTimePerQueryType.push(totalSearchTimeQueryType/(querySubset.length*numSims));
    }
    /* Still include MSE!*/
    console.log(lossValidationPerQueryType)
    console.log(totalExecutionTimePerQueryType)
    console.log(searchTimePerQueryType)
    return [lossValidationPerQueryType, totalExecutionTimePerQueryType, searchTimePerQueryType];
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
