import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';

// This is tensorflow for cpu, if we were to train and it takes long we can change to gpu probably.
// https://towardsdatascience.com/how-to-do-deep-learning-on-graphs-with-graph-convolutional-networks-62acf5b143d0

export class graphConvolutionLayer extends tf.layers.Layer{

    activationLayer: any;
    mInput: tf.Tensor2D;
    inputSize: number;
    outputSize: number;
    mAdjacency: tf.Tensor2D;
    mIdentity: tf.Tensor2D;
    mAdjacencyHat: tf.Tensor2D;
    mWeights: tf.Variable;

    fs: any;
    path: any;
    modelDirectory: string;

    public static className: string = 'graphConvolutionLayer'; 

    constructor(inputSize: number, outputSize: number, activationName: string, layerName?: string) {
        super({});
        this.path = require('path');
        this.fs = require('fs');
        this.modelDirectory = this.getModelDirectory();

        // Define the activation layer used in this layer
        this.activationLayer = tf.layers.activation(<any>{activation: activationName});
        // Define input feature size
        this.inputSize = inputSize;
        // Define output feature size, which is size of node representations
        this.outputSize = outputSize;
        if (layerName){
            this.mWeights = tf.variable(tf.randomNormal([this.inputSize, this.outputSize]), true,
            layerName);
        }
        else{
            this.mWeights = tf.variable(tf.randomNormal([this.inputSize, this.outputSize]), true);
        }
    }
    public async loadWeights(loadPath: string): Promise<void>{
        const fileLocation = this.path.join(this.modelDirectory, loadPath);
        const weights = await this.readWeightFile(fileLocation);
        this.mWeights.assign(weights);
    }

    private readWeightFile(fileLocationWeights: string){
        const readWeights = new Promise<tf.Tensor>( (resolve, reject) => {
            fs.readFile(fileLocationWeights, 'utf8', async function (err, data) {
                if (err) throw err;
                const weightArray: number[][] = JSON.parse(data);
                // const weights: tf.Tensor[] = weightArray.map((x: number[]) => tf.tensor(x));
                const weights: tf.Tensor = tf.tensor(weightArray);
                resolve(weights);
              });
        })
        return readWeights;

    }

    public async saveWeights(savePath: string): Promise<void> {
        const weights = await this.mWeights.array();
        const fileLocation = this.path.join(this.modelDirectory, savePath);
        fs.writeFile(fileLocation, JSON.stringify(weights), function(err: any) {
            if(err) {
                return console.log(err);
            }
        }); 
    }

    
    // I should call build function for flexibility, not sure if I need it yet, but might become needed
    call(input: tf.Tensor2D,  mAdjacency: tf.Tensor2D, kwargs?: any) {
        return tf.tidy(() => {
            /*  Get inverted square of node degree diagonal matrix */
            const mD: tf.Tensor2D = tf.sum(mAdjacency, 1);
            const mDInv: tf.Tensor = tf.diag(tf.rsqrt(mD));

            // Normalised adjecency matrix, we perform this is initialisation to not compute it in the call
            const mAdjacencyHat: tf.Tensor2D = tf.matMul(tf.matMul(mDInv, mAdjacency), mDInv);

            // Tensor that denotes the signal travel in convolution
            const mSignalTravel: tf.Tensor = tf.matMul(mAdjacencyHat, input);
            // Output of convolution, by multiplying with weight matrix and applying non-linear activation function
            // Check if activation function is ok
            const mWeightedSignal: tf.Tensor = this.activationLayer.apply(tf.matMul(mSignalTravel, this.mWeights));
            return mWeightedSignal;
            }
        )
    }

    getClassName() {
        return 'Graph Convolution';
    }

    private getModelDirectory(){          
        const modelDir: string = this.path.join(__dirname, '../../actor-rdf-join-inner-multi-reinforcement-learning/model');
        return modelDir;
    }


}


export class graphConvolutionModel{
    /* For now a simple constructor, should prob use a json config file and with pretrained layers*/
    /* For saving new_model = tf.keras.models.load_model('model.h5', custom_objects={'CustomLayer': CustomLayer}) */
    graphConvolutionalLayer1: graphConvolutionLayer;
    graphConvolutionalLayer2: graphConvolutionLayer;

    denseLayerValue: tf.layers.Layer;
    denseLayerPolicy: tf.layers.Layer;

    reluLayer: tf.layers.Layer;

    denseLayerValueFileName: string;
    denseLayerPolicyFileName: string;

    model: tf.Sequential;

    fs: any;
    path: any;
    modelDirectory: string;

    public constructor(loss?: any, optimizer?: any){
        this.fs = require('fs');
        this.path = require('path')

        this.modelDirectory = this.getModelDirectory();
        this.denseLayerValueFileName = 'denseLayerValue';
        this.denseLayerPolicyFileName = 'denseLayerValue';
    
        this.graphConvolutionalLayer1 = new graphConvolutionLayer(1, 6, "relu");
        this.graphConvolutionalLayer2 = new graphConvolutionLayer(6, 6, "relu");
        this.denseLayerValue = tf.layers.dense({inputShape: [6], units: 1, activation: 'linear', 'trainable': true});
        this.denseLayerPolicy = tf.layers.dense({inputShape: [6], units: 1, activation: 'sigmoid', 'trainable': true});

        this.reluLayer = tf.layers.activation({activation: 'relu', inputShape: [1], 'name': 'finalReluLayer'})
    }

    public forwardPass(inputFeatures: tf.Tensor2D, mAdjacency: tf.Tensor2D){
        return tf.tidy(() => {
            // inputFeatures.print();
            const hiddenState: tf.Tensor = this.graphConvolutionalLayer1.call(inputFeatures, mAdjacency);
            // hiddenState.print();
            const nodeRepresentations: tf.Tensor = this.graphConvolutionalLayer2.call(tf.reshape(hiddenState, [mAdjacency.shape[0], 6]), mAdjacency);
            // nodeRepresentations.print();
            const outputValue = this.denseLayerValue.apply(nodeRepresentations); 
            const outputPolicy = this.denseLayerPolicy.apply(nodeRepresentations);
            // const test = outputValue as tf.Tensor;
            // test.print();
            const outputValueRelu = this.reluLayer.apply(outputValue);
            return [outputValueRelu, outputPolicy] as tf.Tensor[]
        }
        )
    }

    public saveModel(){
        tf.serialization.registerClass(graphConvolutionLayer);
        
        // Hardcoded, should be config when we are happy with performance
        this.graphConvolutionalLayer1.saveWeights('gcnLayer1');
        this.graphConvolutionalLayer2.saveWeights('gcnLayer2');
        this.saveDenseLayer(this.denseLayerValue, this.denseLayerValueFileName);
        this.saveDenseLayer(this.denseLayerPolicy, this.denseLayerPolicyFileName);


    }

    public async loadModel(){
        const layer1 = new graphConvolutionLayer(1, 6, 'relu');
        layer1.loadWeights('gcnLayer1');

        const layer2 = new graphConvolutionLayer(6, 6, 'relu');
        layer2.loadWeights('gcnLayer2');

        const denseLayerValue = await this.loadDenseLayer(this.denseLayerValueFileName);
        const denseLayerPolicy = await this.loadDenseLayer(this.denseLayerPolicyFileName);

        this.graphConvolutionalLayer1 = layer1; this.graphConvolutionalLayer2 = layer2; this.denseLayerValue = denseLayerValue; this.denseLayerPolicy = denseLayerPolicy
    }

    public async saveDenseLayer(layer: tf.layers.Layer, fileName: string){
        const denseConfig: tf.serialization.ConfigDict = layer.getConfig();
        const fileLocationConfig: string = this.path.join(this.modelDirectory, fileName+'Config');
        const fileLocationWeights: string = this.path.join(this.modelDirectory, fileName+'Weights');

        fs.writeFile(fileLocationConfig, JSON.stringify(denseConfig), function(err: any) {
            if(err) {
                return console.log(err);
            }
        }); 
        const weightsLayer: tf.Tensor[] = layer.getWeights();

        let weightsLayerArray: any = await Promise.all(weightsLayer.map(async x => await x.array()));

        fs.writeFile(fileLocationWeights, JSON.stringify(weightsLayerArray), function(err: any) {
            if(err) {
                return console.log(err);
            }
        }); 


    }

    public async loadDenseLayer(fileName: string){
        const fileLocationWeights = this.path.join(this.modelDirectory, fileName + 'Weights');
        const initialisedDenseLayer = new Promise<tf.layers.Layer>( (resolve, reject) => {

            fs.readFile(fileLocationWeights, 'utf8', async function (err, data) {
                if (err) throw err;
                const weightArray: number[][] = JSON.parse(data);
                const weights: tf.Tensor[] = weightArray.map((x: number[]) => tf.tensor(x));
                const finalDenseLayer: tf.layers.Layer = tf.layers.dense({inputShape: [6], units: 1, activation: 'linear', weights: weights});
                resolve(finalDenseLayer);
              });
        })

        return initialisedDenseLayer        
    }

    private getModelDirectory(){          
        const modelDir: string = this.path.join(__dirname, '../../actor-rdf-join-inner-multi-reinforcement-learning/model');
        return modelDir;
    }

    private loadModelConfig(){
        console.trace()
        const modelDir = this.getModelDirectory();
        const modelConfig = new Promise<string[]>( (resolve, reject) => {

            fs.readFile(modelDir + '/modelConfig.json', 'utf8', async function (err, data) {
                if (err) throw err;
                const weightArray: string[] = JSON.parse(data)['layers'];
                console.log(weightArray)
                resolve(weightArray);
              });
        })
    }

}

export class graphConvolutionModelFunctional{
    graphConvolutionalLayer1: graphConvolutionLayer;
    graphConvolutionalLayer2: graphConvolutionLayer;

    denseLayerValue: tf.layers.Layer;
    denseLayerPolicy: tf.layers.Layer;

    reluLayer: tf.layers.Layer;

    denseLayerValueFileName: string;
    denseLayerPolicyFileName: string;

    model: tf.Sequential;

    fs: any;
    path: any;
    modelDirectory: string;

    public constructor(inputFeatureDim: number, outputFeatureDim: number){
        const model = tf.sequential()
        model.add(tf.layers.dense({units: inputFeatureDim, inputShape: [inputFeatureDim]}))
        model.add(tf.layers.dense({units: 16}))
        model.add(tf.layers.dense({units: 16}))
        model.add(tf.layers.dense({units: outputFeatureDim}))
        model.compile({optimizer: 'sgd', loss: 'meanSquaredError'})
   }
}

const model = new graphConvolutionModel();

const yArray = [10, 50, 12, 33];
const featureMatrix = [[1,2,3,4,5,6],[7,8,9,10,11,12], [1,2,3,4,5,7], [7,8,9,10,11,12]];
const adjacencyMatrixes = [[[1,1,0,0,0,0],[1,1,1,0,0,0], [0,1,1,1,0,0], [0,0,1,1,1,0], [0,0,0,1,1,1], [0,0,0,0,1,1]],
[[1,1,0,0,0,0],[1,1,1,0,0,0], [0,1,1,1,0,0], [0,0,1,1,1,0], [0,0,0,1,1,1], [0,0,0,0,1,1]],
[[1,1,0,0,0,0],[1,1,1,0,0,0], [0,1,1,1,0,0], [0,0,1,1,1,0], [0,0,0,1,1,1], [0,0,0,0,1,1]],
[[1,1,0,0,0,0],[1,1,1,0,0,0], [0,1,1,1,0,0], [0,0,1,1,1,0], [0,0,0,1,1,1], [0,0,0,0,1,1]]];

const y = tf.tensor(yArray);
// const featureMatrix = tf.tensor(featureMatrixArray);
// const adjacencyMatrixes = tf.tensor(adjacencyMatrixeSArray);

const optimizer = tf.train.adam(.05);
for (let i = 0; i<150; i++){
    const loss =  optimizer.minimize(() => {

        const valuePredictions: tf.Tensor[] = []
    
        for (let i = 0;i<adjacencyMatrixes.length;i++){
            const adjTensor = tf.tensor2d(adjacencyMatrixes[i]);
    
            /* Pretend we don't know the prediction output of our join node for training purposes*/
            featureMatrix[i][featureMatrix[i].length-1] = 0;
            const forwardPassOutput: tf.Tensor[] = model.forwardPass(tf.tensor2d(featureMatrix[i], [adjacencyMatrixes[i].length,1]), adjTensor) as tf.Tensor[];
    
            const joinValuePrediction: tf.Tensor = forwardPassOutput[0].slice([forwardPassOutput[0].shape[0]-1, 0]);
    
            valuePredictions.push(joinValuePrediction);
        }
        const predictionTensor: tf.Tensor = tf.concat(valuePredictions).squeeze();
        predictionTensor.print()
        y.print()
        const loss = tf.losses.meanSquaredError(y, predictionTensor);
        loss.data().then(l => console.log('Loss', l));
        const scalarLoss: tf.Scalar = tf.squeeze(loss);
        return scalarLoss
        }, true)!;    
}
