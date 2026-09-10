export type RegionGeometry = {type:"Polygon";coordinates:number[][][]} | {type:"MultiPolygon";coordinates:number[][][][]};
export interface RegionCollection {type:"FeatureCollection";features:{type:"Feature";geometry:RegionGeometry;properties:{nom:string}}[]}
