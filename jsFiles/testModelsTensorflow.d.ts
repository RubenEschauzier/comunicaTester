import * as tf from '@tensorflow/tfjs-node';
export declare class graphConvolutionLayer extends tf.layers.Layer {
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
    static className: string;
    constructor(inputSize: number, outputSize: number, activationName: string, layerName?: string);
    loadWeights(loadPath: string): Promise<void>;
    private readWeightFile;
    saveWeights(savePath: string): Promise<void>;
    call(input: tf.Tensor2D, mAdjacency: tf.Tensor2D, kwargs?: any): tf.Tensor<tf.Rank>;
    getClassName(): string;
    private getModelDirectory;
}
export declare class graphConvolutionModel {
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
    constructor(loss?: any, optimizer?: any);
    forwardPass(inputFeatures: tf.Tensor2D, mAdjacency: tf.Tensor2D): tf.Tensor<tf.Rank>[];
    saveModel(): void;
    loadModel(): Promise<void>;
    saveDenseLayer(layer: tf.layers.Layer, fileName: string): Promise<void>;
    loadDenseLayer(fileName: string): Promise<tf.layers.Layer>;
    private getModelDirectory;
    private loadModelConfig;
}
export declare class graphConvolutionModelFunctional {
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
    constructor(inputFeatureDim: number, outputFeatureDim: number);
}
