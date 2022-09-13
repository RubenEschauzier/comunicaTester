// import {LoggerTimer} from "@comunica/logger-timer";
// import {QueryEngineFactory} from "@comunica/query-sparql";
import {MCTSJoinInformation} from '@comunica/model-trainer'
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

class trainComunicaModel{
    public engine: any;
    public queries: string[];
    public loadedQueries: Promise<boolean>;
    public modelTrainer;
    public masterTree: any;

    public constructor(){
        const QueryEngine = require('@comunica/query-sparql-file').QueryEngineFactory;
        this.modelTrainer = require('@comunica/model-trainer');
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
        // this.masterTree = new MCTSMasterTree();
        this.engine = new QueryEngine().create({
            configPath: __dirname+"/config-file.json", // Relative or absolute path 
        });
        this.queries = [];
    }

    public async executeQuery(query: string, sources:string[], planHolder: Map<string, number>){
        this.engine = await this.engine;
        const bindingsStream = await this.engine.queryBindings(query, {sources: sources, masterTree: this.masterTree, planHolder: planHolder});
        return bindingsStream
    }

    public async explainQuery(query:string, sources:string[]){
        const results = await this.engine.explain(query, {sources: sources, masterTree: this.masterTree});
        return results

    }

    public async trainModel(masterMap: Map<string, MCTSJoinInformation>): Promise<number>{
        // this.engine.getModelHolder().getModel().layersValue[0][0].mWeights.print() 
        const episodeLoss = this.engine.trainModel(masterMap);
        // this.engine.getModelHolder().getModel().denseLayerValue.getWeights()[0].print();
        return episodeLoss
    }

    public async loadWatDivQueries(queryDir: string){
        const fs = require('fs');
        const path = require('path');
        const loadingComplete = new Promise<boolean> (async (resolve, reject) => {
            try {
                // Get the files as an array
                const files = await fs.promises.readdir( queryDir );
                for( const file of files ) {
                    // Get the full paths
                    const filePath = path.join( queryDir, file );    
                    const data = fs.readFileSync(filePath,'utf8');
                    this.queries.push(data);
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

    public resetMasterTree(){
        this.masterTree = new this.modelTrainer.MCTSMasterTree();
    }

}
const nResults = [
    0, 0,  0,  0, 4374, 4374,  0, 0,  1,
    0, 0,  0,  0,    0,   33, 33, 3,  3,
    1, 1, 60, 34,    0,    0,  2, 1, 13,
    0, 0,  2,  0,    0,    0,  0, 0,  0,
    0, 0,  2,  1
  ]

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

function stopCount(hrstart: [number, number]) {
    // execution time simulated with setTimeout function
    let hrend = process.hrtime(hrstart);
    return hrend[0]*1000 + hrend[1]/1000000;
}

let trainer: trainComunicaModel = new trainComunicaModel();
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
const loadingComplete: Promise<boolean> = trainer.loadWatDivQueries('output/queries');
const numSimulationsPerQuery: number = 10;
const numEpochs: number = 25;
const hrTime = process.hrtime();
let numCompleted: number = 0;

function addEndListener(beginTime: number, planMap: Map<string, number>, masterMap: Map<string, MCTSJoinInformation>, bindingStream: any, process: any){
    const joinPlanQuery = Array.from(planMap)[planMap.size-1][0];
    // Ensure we have our joinplan in the masterMap, this should always be true
    if (masterMap.get(joinPlanQuery)){
        // We don't execute the query if we already recorded an execution time for this query during this epoch, this is to save time.
        if (!masterMap.get(joinPlanQuery)!.actualExecutionTime || masterMap.get(joinPlanQuery)!.actualExecutionTime == 0){
            bindingStream.on('data', (binding: any) => {
            });
            
            bindingStream.on('end', () => {
                const end: number[] = process.hrtime();
                const endSeconds: number = end[0] + end[1] / 1000000000;
                const elapsed: number = endSeconds-beginTime;
                // planMap.forEach((value, key, map) => map.set(key, elapsed))
                // Update the execution time for each joinPlan
                planMap.forEach((value, key) => {const joinInformationPrev = masterMap.get(joinPlanQuery)! 
                    joinInformationPrev.actualExecutionTime = elapsed;
                    masterMap.set(joinPlanQuery, joinInformationPrev);
                })
                numCompleted += 1;
            })    
        }
        else{
            numCompleted += 1;
        }    
    }
    else{
        console.warn("We have joinPlan not in Mastermap!");
    }
}
loadingComplete.then( async result => {
    const cleanedQueries: string[][] = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
    // const resultQuery  = await trainer.executeQuery('SELECT * WHERE {?s ?p ?o } LIMIT 100', ["output/dataset.nt"]);
    // const resultArray = [];

    // // Perform one query to index the database into comunica 
    // const bindingsStream = await trainer.executeQuery('SELECT' + cleanedQueries[0][0], ["output/dataset.nt"]);

    const lossEpoch: number[] = []
    for (let epoch = 0; epoch<numEpochs; epoch++){
        const lossEpisode: number[] = []
        for (let i = 0; i<cleanedQueries.length; i++){
            // console.log(`cleanedQueries ${i+1}/${cleanedQueries.length}`);
            const querySubset: string[] = [... cleanedQueries[i]];
            querySubset.shift();
            for (let j = 0; j <querySubset.length; j++){
                // console.log(`Query ${'SELECT' + querySubset[j]}`);
                /* Execute n queries and record the results */
                for (let n = 0; n < numSimulationsPerQuery; n++){
                    let startTime = process.hrtime();
                    const startTimeSeconds = startTime[0] + startTime[1] / 1000000000 ;
                    const mapResults = new Map()
                    const bindingsStream = await trainer.executeQuery('SELECT' + querySubset[j], ["output/dataset.nt"], mapResults);
                    // addEndListener(startTimeSeconds, mapResults, trainer.masterTree.masterMap, bindingsStream, process);
                }
                // const resultBindings = await bindingsStream.toArray();
                // Wait for all queries in the episode to finish 
                // while (numCompleted < numSimulationsPerQuery){
                //     continue;
                // }
                /* Train the model using the queries*/
                const loss: number = await trainer.trainModel(trainer.masterTree.masterMap);
                trainer.resetMasterTree();
                if (loss){
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
        lossEpoch.push(sum(lossEpisode)/lossEpisode.length);
        console.log(`Epoch ${epoch}, loss: ${lossEpoch[epoch]}`);
    }
    console.log(lossEpoch);
    // console.log(resultArray);
    // const stream = trainer.executeQuery('SELECT' + cleanedQueries[1], ['http://localhost:3000/sparql'])
    function sum(arr: number[]) {
        var result = 0, n = arr.length || 0; //may use >>> 0 to ensure length is Uint32
        while(n--) {
          result += +arr[n]; // unary operator to ensure ToNumber conversion
        }
        return result;
      }
      
}

)
