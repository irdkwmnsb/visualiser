
type StoredEvent = {
    name: string;
    state: any;
    args: any[];
}

type Snapshot = {
    curState?: any;
    curEvent?: StoredEvent;
    currentStep?: number;
    events?: StoredEvent[];
    bindedObjects?: Record<string, any>;
    next: () => void;
    start: (...args: any[]) => void;
}

export class RuntimeStore {
    events: StoredEvent[] = [];
    bindedObjects: Record<string, any> = {};
    continuation?: () => void;
    subscribers: (() => void)[] = [];
    algorithm?: (...args) => Promise<void>;
    currentStep = 0;

    constructor(algorithm: (...args: any[]) => Promise<void>) {
        this.algorithm = algorithm;
    }

    bind = (name: string, value: any) => {
        this.bindedObjects[name] = value;
    }

    here = async (name: string, ...args: any[]): Promise<void> => {
        this.currentStep++;
        this.events.push({
            name,
            state: { ...this.bindedObjects },
            args
        });
        this.notifyReact();
        return new Promise((resolve) => {
            this.continuation = resolve;
        });
    }

    next = () => {
        if (this.continuation) {
            this.continuation();
        }
    }

    get curState () {
        return this.events[this.currentStep - 1]?.state;
    }

    get curEvent() {
        return this.events[this.currentStep - 1];
    }

    notifyReact = () => {
        this.updateSnapshot();
        this.subscribers.forEach((x) => x());
    }

    updateSnapshot = () => {
        this._dataSnapshot = {
            curState: this.curState,
            curEvent: this.curEvent,
            currentStep: this.currentStep,
            events: this.events,
            bindedObjects: this.bindedObjects,
            next: this.next,
            start: this.start,
        }
    }

    getCurSnapshot = () => {
        return this._dataSnapshot;
    }

    start = (...args: any[]) => {
        this.events = [];
        this.continuation = undefined;
        this.currentStep = 0;
        this.bindedObjects = {};
        this.algorithm(...args);
    }

    subscribe = (callback: () => void) => {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter((x) => x !== callback);
        };
    }

    _dataSnapshot: Snapshot = {
        start: this.start,
        next: this.next,
    };
}