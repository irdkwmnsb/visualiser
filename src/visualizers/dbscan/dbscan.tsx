import { bind, here } from "../../lib";

export const dbscan = async (points: number[][], eps: number, min_samples: number) => {
    let labels = new Array(points.length).fill(0);
    let cluster = new Mutable<number>(1);

    bind("points", points);
    bind("labels", labels);
    bind("cluster", cluster);

    await here("start");
    let neighbors = findNeighbors(points, eps);
    for (let i = 0; i < points.length; i++) {
        if (await expandCluster(labels, neighbors, i, cluster, min_samples)) {
            await here("new_cluster", cluster.value);
            cluster.value++;
        }
    }
    await here("done");
}

const expandCluster = async (
    labels: number[],
    neighbors: number[][],
    i: number,
    cluster: Mutable<number>,
    min_samples: number
): Promise<boolean> => {
    if (labels[i] !== 0) {
        return false;
    }

    if (neighbors[i].length < min_samples) {
        await here("noise", i, -1, neighbors[i].length);
        labels[i] = -1;
        return false;
    } 

    await here("expand_cluster", i, cluster.value, neighbors[i].length);
    labels[i] = cluster.value;
    for (let neighbor of neighbors[i]) {
        if (labels[neighbor] === 0) {
            await expandCluster(labels, neighbors, neighbor, cluster, min_samples);
        }
    }

    return true;
}

const findNeighbors = (points: number[][], eps: number): number[][] => {
    let neighbors = new Array(points.length).fill(null).map(() => []);
    for (let i = 0; i < points.length - 1; i++) {
        for (let j = i + 1; j < points.length; j++) {
            if (distance(points[i], points[j]) < eps) {
                neighbors[i].push(j);
                neighbors[j].push(i);
            }
        }
    }
    return neighbors;
}

const distance = (p1: number[], p2: number[]): number => 
    Math.sqrt(p1.reduce((acc, cur, i) => acc + Math.pow(cur - p2[i], 2), 0));

// TODO: move to lib?
class Mutable<T> {
    constructor(public value: T) { 
        this.value = value;
    }
}

export type DBScanState = {
    cluster: Mutable<number>;
    labels: number[];
    points: number[][];
}

export type DBScanEvent = Start | Done | NewCluster | ExpandCluster | Noise;

type Start = { name: "start"; }
type Done = { name: "done";}
type NewCluster = {
    name: "new_cluster";
    cluster: number;
}
type ExpandCluster = {
    name: "expand_cluster";
    point: number;
    neighbors_count: number;
}
type Noise = {
    name: "noise";
    point: number;
    neighbors_count: number;
}

export type DBScanArguments = [number[][], number, number];
