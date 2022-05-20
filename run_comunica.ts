// import {LoggerTimer} from "@comunica/logger-timer";
// import {QueryEngineFactory} from "@comunica/query-sparql";
// const fs = require('fs');
// const http = require('http');
// const path = require('path');

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
  

class queryTester {
    myEngine: any;
    timer: any;
    constructor(){
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;

        // const QueryEngineFactory = require('@comunica/query-sparql').QueryEngineFactory;
        // const timer = require('@comunica/logger-timer').LoggerTimer;
        // console.log(timer);
        // const myEngine = new QueryEngineFactory().create({
        //     configPath: __dirname+"/config.json", // Relative or absolute path 
        // });
        this.myEngine = new QueryEngine();

    }

    async queryComunica(query: string, sources:string[]) {
        /* Timing the command is still wrong */

        this.myEngine = await this.myEngine;
        const bindingsStream = await this.myEngine.query(query, {sources: sources});
        return bindingsStream;
        
    }
    timedQueryExecution(query: string, sources: string[]){
        const start: number = performance.now();
        const bindingResult = this.queryComunica(query, sources);
        let elapsed: number = performance.now() - start;
        return elapsed;
    }
}

class queryTesterTest {
    myEngine: any;
    timer: any;
    constructor(){
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;
        this.myEngine = new QueryEngine();

    }

    async queryComunica(query: string, sources:string[]) {
        /* Timing the command is still wrong */

        this.myEngine = await this.myEngine;
        const bindingsStream = await this.myEngine.query(query, {sources: sources});
        return bindingsStream;
        
    }
    timedQueryExecution(query: string, sources: string[]){
        const start: number = performance.now();
        const bindingResult = this.queryComunica(query, sources);
        let elapsed: number = performance.now() - start;
        return elapsed;
    }
}

class trainComunicaModel{
    private engine: any;
    public queries: string[];
    public loadedQueries: Promise<boolean>;

    public constructor(){
        // const QueryEngine = require('@comunica/query-sparql').QueryEngine;
        // this.engine = new QueryEngine();
        this.queries = [];
    }

    public async executeQuery(query: string, sources:string[]){
        this.engine = await this.engine;
        const bindingsStream = await this.engine.query(query, {sources: sources});
        return bindingsStream
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

}

// let testQuery: string = `SELECT ?s ?p ?o WHERE {?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p ?o} LIMIT 100`;
// let testQuery2: string = `SELECT ?s ?p ?o WHERE {?s ?p <http://dbpedia.org/resource/Belgium>. ?s ?p <http://dbpedia.org/resource/Netherlands>. ?s ?p <http://dbpedia.org/resource/England>. ?s ?p ?o} LIMIT 100`
// let testSources: string[] = ['http://fragments.dbpedia.org/2015/en','https://www.rubensworks.net','https://ruben.verborgh.org/profile/']

// let tester = new queryTester();
// let timeSpent: number  = tester.timedQueryExecution(testQuery2, testSources);



function call(query: string) {
    const req = http.request(options, res => {
    });
  
    req.write('query=' + query);
    req.end();
}

function stopCount(hrstart: [number, number]) {
    // execution time simulated with setTimeout function
    let hrend = process.hrtime(hrstart);
    return hrend[0]*1000 + hrend[1]/1000000;
}

let trainer: trainComunicaModel = new trainComunicaModel();
const loadingComplete: Promise<boolean> = trainer.loadWatDivQueries('output/queries');
loadingComplete.then( result => {
    const cleanedQueries: string[][] = trainer.queries.map(x => x.replace(/\n/g, '').replace(/\t/g, '').split('SELECT'));
    for (let i = 0; i<cleanedQueries.length; i++){
        const querySubset: string[] = cleanedQueries[i];
        querySubset.shift();
        for (let j = 0; j <querySubset.length; j++){
            call('SELECT' + querySubset[j]);
            break;
        }
        break;
    
    }
    // const stream = trainer.executeQuery('SELECT' + cleanedQueries[1], ['http://localhost:3000/sparql'])
}
)
