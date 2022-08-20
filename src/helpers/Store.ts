import EventEmitter from "eventemitter3";

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
    Keys extends string | number,
    Axes extends string | number = null,
> extends EventEmitter<{
    [StoreEvents.keydown]: (key: Keys, value: number) => void,
    [StoreEvents.keyup]: (key: Keys, value: number) => void,
    [StoreEvents.keyvaluechange]: (key: Keys, value: number) => void,
    [StoreEvents.click]: (key: Keys, value: number) => void,

    [StoreEvents.axismove]: (axis: Axes, value: number) => void,
}> {
    static readonly events = StoreEvents;

    readonly events = StoreEvents;

    protected axes = new Map<Axes, number>();
    protected keys = new Map<Keys, number>();
    protected axesMultipliers = new Map<Axes, number>();
    protected keysMultipliers = new Map<Keys, number>();
    protected keysDownTime = new Map<Keys, number>();


    constructor(keysList?: Keys[], axesList?: Axes[]) {
        super();
    }

    clear() {
        this.axes.clear();
        this.keys.clear();
        this.keysDownTime.clear();
    }


    private _updateKey(key: Keys, value = 0) {
        value *= this.keysMultipliers.get(key) ?? 1;

        const lastValue = this.keys.get(key);

        if (lastValue !== value) {
            this.keys.set(key, value);

            this.emit(StoreEvents.keyvaluechange, key, value);

            if (value === 0) {
                this.emit(StoreEvents.keyup, key, value);

                if (Date.now() - (this.keysDownTime.get(key) || 0) < clickMaxTime) {
                    this.emit(StoreEvents.click, key, value);
                }
            } else if (value === 1) {
                this.keysDownTime.set(key, Date.now());
                this.emit(StoreEvents.keydown, key, value);
            }
        }
    }

    private _updateAxis(key: Axes, value = 0) {
        value *= this.axesMultipliers.get(key) ?? 1;

        if (this.axes.get(key) !== 0 || value !== 0) {
            this.axes.set(key, value);
            this.emit(StoreEvents.axismove, key, value);
        }
    }


    updateKey(key: Keys, value: number) {
        this._updateKey(key, value);
        // this._updateAxis(key, value);
    }

    updateAxis(axis: Axes, value: number) {
        this._updateAxis(axis, value);
        // this._updateKey(axis, value);
    }

    keyup(key: Keys) {
        this.updateKey(key, 0);
    }

    keydown(key: Keys) {
        this.updateKey(key, 1);
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
