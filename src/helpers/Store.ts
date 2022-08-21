import EventEmitter from "eventemitter3";
import { Awaiter } from "./Awaiter";

export type StoreEvents = 'keydown'|'keyup'|'keyvaluechange'|'click'|'axismove';

const clickMaxTime = 100;
const dblclickMaxTime = 300;

export interface BinNextKeyInfo<Keys, Source> {
    key: Keys;
    value: number;
    source?: Source;
}

export interface BinNextAxisInfo<Axes, Source> {
    axis: Axes;
    value: number;
    source?: Source;
}

export class Store<
    Keys extends string,
    Axes extends string = null,
    Source = any,
    EventTypes extends {[key: string]: Function} = {}
> extends EventEmitter<{
    'keydown': (key: Keys, value: number, source?: Source) => void,
    'keyup': (key: Keys, value: number, source?: Source) => void,
    'keyvaluechange': (key: Keys, value: number, source?: Source) => void,
    'click': (key: Keys, value: number, source?: Source) => void,

    'axismove': (axis: Axes, value: number, source?: Source) => void,
} & {
    [key in keyof EventTypes]: EventTypes[key];
}> {

    protected axes = new Map<Axes, number>();
    protected keys = new Map<Keys, number>();
    protected axesMultipliers = new Map<Axes, number>();
    protected keysMultipliers = new Map<Keys, number>();
    protected keysDownTime = new Map<Keys, number>();

    protected keysBindings = new Map<Keys, Set<Keys>>();
    protected axesBindings = new Map<Axes, Set<Axes>>();

    protected nextKeyBindAwaiter = new Awaiter<BinNextKeyInfo<Keys, Source>>();
    protected nextAxisBindAwaiter = new Awaiter<BinNextAxisInfo<Axes, Source>>();


    constructor(keysList?: Keys[], axesList?: Axes[]) {
        super();
    }

    clear() {
        this.axes.clear();
        this.keys.clear();
        this.keysDownTime.clear();
    }

    reset(source?: Source) {
        this.keysDownTime.clear();

        for (const key of this.keys.keys()) {
            this.updateKey(key, 0, source);
        }

        for (const axis of this.axes.keys()) {
            this.updateAxis(axis, 0, source);
        }
    }


    private emitKeyEvent(
        event: 'keydown' | 'keyup' | 'keyvaluechange' | 'click',
        key: Keys, value: number, source?: Source,
    ) {
        // @ts-ignore
        this.emit(event, key, value, source);

        const s = this.keysBindings.get(key);

        if (!s) {
            return;
        }

        for (const bkey of s) {
            this.keys.set(bkey, value);
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
                needEmit && this.emitKeyEvent('keyup', key, value, source);

                if (Date.now() - (this.keysDownTime.get(key) || 0) < clickMaxTime) {
                    needEmit && this.emitKeyEvent('click', key, value, source);
                }
            } else if (!lastValue) {
                if (this.nextKeyBindAwaiter.active) {
                    this.nextKeyBindAwaiter.resolve({key, value, source});
                }
                this.keysDownTime.set(key, Date.now());
                needEmit && this.emitKeyEvent('keydown', key, value, source);
            }

            needEmit && this.emitKeyEvent('keyvaluechange', key, value, source);
        }
    }

    private emitAxisEvent(event: 'axismove', axis: Axes, value: number, source?: Source) {
        // @ts-ignore
        this.emit(event, axis, value, source);

        const s = this.axesBindings.get(axis);

        if (!s) {
            return;
        }

        for (const baxis of s) {
            this.axes.set(baxis, value);
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

            if (lastValue !== undefined || value !== 0) {
                if (this.nextAxisBindAwaiter.active) {
                    this.nextAxisBindAwaiter.resolve({axis, value, source});
                }

                this.emitAxisEvent('axismove', axis, value, source);
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


    setKeysMultipliers(map: Partial<Record<Keys, number>>) {
        for (const [key, value] of Object.entries(map)) {
            this.keysMultipliers.set(<Keys> key, <number> value);
        }
    }

    setAxesMultipliers(map: Partial<Record<Axes, number>>) {
        for (const [key, value] of Object.entries(map)) {
            this.axesMultipliers.set(<Axes> key, <number> value);
        }
    }


    bindKey(sourceKey: Keys, targetKey: Keys, source?: Source) {
        if (sourceKey === targetKey) {
            throw new Error(`Source and Target keys is equals ("${sourceKey}")`);
        }

        let s = this.keysBindings.get(sourceKey);

        if (!s) {
            s = new Set();
            this.keysBindings.set(sourceKey, s);
        }

        s.add(targetKey);
        this.updateKey(targetKey, this.getKeyValue(sourceKey), source);
    }

    bindKeys(map: Partial<Record<Keys, Keys>>, source?: Source) {
        for (const [sourceKey, targetKey] of Object.entries(map)) {
            this.bindKey(<any> sourceKey, <any> targetKey, source);
        }
    }

    unbindKey(sourceKey: Keys, targetKey: Keys, source?: Source) {
        this.keysBindings.get(sourceKey)?.delete(targetKey);
        this.updateKey(targetKey, 0, source);
    }

    async bindNextKey(
        targetKey: Keys,
        {
            validate = () => true,
            cancel = () => false,
            source,
        }: {
            validate?: (info: BinNextKeyInfo<Keys, Source>) => boolean;
            cancel?: (info: BinNextKeyInfo<Keys, Source>) => boolean;
            source?: Source;
        } = {},
    ) {
        let info: BinNextKeyInfo<Keys, Source>;

        do {
            info = await this.nextKeyBindAwaiter.wait();

            if (cancel(info)) {
                return null;
            }
        } while (info.key === targetKey || !validate(info));

        this.bindKey(info.key, targetKey, source);

        return info;
    }


    bindAxis(sourceAxis: Axes, targetAxis: Axes, source?: Source) {
        if (sourceAxis === targetAxis) {
            throw new Error(`Source and Target axes is equals ("${sourceAxis}")`);
        }

        let s = this.axesBindings.get(sourceAxis);

        if (!s) {
            s = new Set();
            this.axesBindings.set(sourceAxis, s);
        }

        s.add(targetAxis);
        this.updateAxis(targetAxis, this.getAxisValue(sourceAxis), source);
    }

    bindAxes(map: Partial<Record<Axes, Axes>>, source?: Source) {
        for (const [sourceAxis, targetAxis] of Object.entries(map)) {
            this.bindAxis(<any> sourceAxis, <any> targetAxis, source);
        }
    }

    unbindAxis(sourceAxis: Axes, targetAxis: Axes, source?: Source) {
        this.axesBindings.get(sourceAxis)?.delete(targetAxis);
        this.updateAxis(targetAxis, 0, source);
    }

    async bindNextAxis(
        target: Axes,
        {
            validate = () => true,
            cancel = () => false,
            source,
        }: {
            validate?: (info: BinNextAxisInfo<Axes, Source>) => boolean;
            cancel?: (info: BinNextAxisInfo<Axes, Source>) => boolean;
            source?: Source;
        } = {},
    ) {
        let info: BinNextAxisInfo<Axes, Source>;

        do {
            info = await this.nextAxisBindAwaiter.wait();

            if (cancel(info)) {
                return null;
            }
        } while (info.axis === target || !validate(info));

        this.bindAxis(info.axis, target, source);

        return info;
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
