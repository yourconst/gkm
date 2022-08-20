import EventEmitter from "eventemitter3";
import { Awaiter } from "./Awaiter";

export enum StoreEvents {
    keydown = 'keydown',
    keyup = 'keyup',
    keyvaluechange = 'keyvaluechange',
    click = 'click',

    axismove = 'axismove',
}

const clickMaxTime = 100;
const dblclickMaxTime = 300;

export class Store<
    Keys extends string,
    Axes extends string = null,
    Source = any,
> extends EventEmitter<{
    [StoreEvents.keydown]: (key: Keys, value: number, source?: Source) => void,
    [StoreEvents.keyup]: (key: Keys, value: number, source?: Source) => void,
    [StoreEvents.keyvaluechange]: (key: Keys, value: number, source?: Source) => void,
    [StoreEvents.click]: (key: Keys, value: number, source?: Source) => void,

    [StoreEvents.axismove]: (axis: Axes, value: number, source?: Source) => void,
}> {
    static readonly events = StoreEvents;

    readonly events = StoreEvents;

    protected axes = new Map<Axes, number>();
    protected keys = new Map<Keys, number>();
    protected axesMultipliers = new Map<Axes, number>();
    protected keysMultipliers = new Map<Keys, number>();
    protected keysDownTime = new Map<Keys, number>();

    protected keysBindings = new Map<Keys, Set<Keys>>();
    protected axesBindings = new Map<Axes, Set<Axes>>();

    protected nextKeyBindAwaiter = new Awaiter<Keys>();
    protected nextAxisBindAwaiter = new Awaiter<Axes>();


    constructor(keysList?: Keys[], axesList?: Axes[]) {
        super();
    }

    clear() {
        this.axes.clear();
        this.keys.clear();
        this.keysDownTime.clear();
    }


    private emitKeyEvent(
        event: StoreEvents.keydown | StoreEvents.keyup | StoreEvents.keyvaluechange | StoreEvents.click,
        key: Keys, value: number, source?: Source,
    ) {
        this.emit(event, key, value, source);

        const s = this.keysBindings.get(key);

        if (!s) {
            return;
        }

        for (const bkey of s) {
            this.emitKeyEvent(event, bkey, value, source);
        }
    }

    private _updateKey(key: Keys, value = 0, source?: Source) {
        value *= this.keysMultipliers.get(key) ?? 1;

        const lastValue = this.keys.get(key);

        if (lastValue !== value) {
            this.keys.set(key, value);

            const needEmit = lastValue !== undefined || value !== 0;

            if (value === 0) {
                needEmit && this.emitKeyEvent(StoreEvents.keyup, key, value, source);

                if (Date.now() - (this.keysDownTime.get(key) || 0) < clickMaxTime) {
                    needEmit && this.emitKeyEvent(StoreEvents.click, key, value, source);
                }
            } else if (!lastValue) {
                if (this.nextKeyBindAwaiter.active) {
                    this.nextKeyBindAwaiter.resolve(key);
                }
                this.keysDownTime.set(key, Date.now());
                needEmit && this.emitKeyEvent(StoreEvents.keydown, key, value, source);
            }

            needEmit && this.emitKeyEvent(StoreEvents.keyvaluechange, key, value, source);
        }
    }

    private emitAxisEvent(event: StoreEvents.axismove, axis: Axes, value: number, source?: Source) {
        this.emit(event, axis, value, source);

        const s = this.axesBindings.get(axis);

        if (!s) {
            return;
        }

        for (const baxis of s) {
            this.emitAxisEvent(event, baxis, value, source);
        }
    }

    private _updateAxis(axis: Axes, value = 0, source?: Source) {
        if (Math.abs(value) < 0.05) {
            value = 0;
        }

        value *= this.axesMultipliers.get(axis) ?? 1;

        const lastValue = this.axes.get(axis);

        if (lastValue !== 0 || value !== 0) {
            this.axes.set(axis, value);

            if (lastValue !== undefined && value !== 0) {
                if (this.nextAxisBindAwaiter.active) {
                    this.nextAxisBindAwaiter.resolve(axis);
                }

                this.emitAxisEvent(StoreEvents.axismove, axis, value, source);
            }
        }
    }


    updateKey(key: Keys, value: number, source?: Source) {
        this._updateKey(key, value, source);
        // this._updateAxis(key, value);
    }

    updateAxis(axis: Axes, value: number, source?: Source) {
        this._updateAxis(axis, value, source);
        // this._updateKey(axis, value);
    }

    keyup(key: Keys, source?: Source) {
        this.updateKey(key, 0, source);
    }

    keydown(key: Keys, source?: Source) {
        this.updateKey(key, 1, source);
    }


    // @ts-ignore
    setKeysMultipliers(map: Record<Keys, number>) {
        for (const [key, value] of Object.entries(map)) {
            this.keysMultipliers.set(<Keys> key, <number> value);
        }
    }

    // @ts-ignore
    setAxesMultipliers(map: Record<Axes, number>) {
        for (const [key, value] of Object.entries(map)) {
            this.axesMultipliers.set(<Axes> key, <number> value);
        }
    }


    bindKey(source: Keys, target: Keys) {
        if (source === target) {
            throw new Error(`Source and Target keys are equals ("${source}")`);
        }

        let s = this.keysBindings.get(source);

        if (!s) {
            s = new Set();
            this.keysBindings.set(source, s);
        }

        s.add(target);
    }

    bindKeys(map: Partial<Record<Keys, Keys>>) {
        for (const [source, target] of Object.entries(map)) {
            this.bindKey(<any> source, <any> target);
        }
    }

    unbindKey(source: Keys, target: Keys) {
        this.keysBindings.get(source)?.delete(target);
    }

    async bindNextKey(target: Keys) {
        const source = await this.nextKeyBindAwaiter.wait();

        this.bindKey(source, target);

        return source;
    }


    bindAxis(source: Axes, target: Axes) {
        if (source === target) {
            throw new Error(`Source and Target axes are equals ("${source}")`);
        }

        let s = this.axesBindings.get(source);

        if (!s) {
            s = new Set();
            this.axesBindings.set(source, s);
        }

        s.add(target);
    }

    bindAxes(map: Partial<Record<Axes, Axes>>) {
        for (const [source, target] of Object.entries(map)) {
            this.bindAxis(<any> source, <any> target);
        }
    }

    unbindAxis(source: Axes, target: Axes) {
        this.axesBindings.get(source)?.delete(target);
    }

    async bindNextAxis(target: Axes) {
        const source = await this.nextAxisBindAwaiter.wait();

        this.bindAxis(source, target);

        return source;
    }


    isKeyPressed(key: Keys) {
        return !!this.keys.get(key);
    }

    getKeyValue(key: Keys) {
        return this.keys.get(key) || 0;
    }

    getAxisValue(axis: Axes) {
        return this.axes.get(axis) || 0;
    }
}


const store = new Store<'a' | 'b', 'c'>();

store.addListener(StoreEvents.click, (key) => console.log(key));
