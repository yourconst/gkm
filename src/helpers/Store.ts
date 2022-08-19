import EventEmitter from 'eventemitter3';

enum EVENTS {
    keydown = 'keydown',
    keyup = 'keyup',
    click = 'click',

    axismove = 'axismove',
}

const clickMaxTime = 100;
const dblclickMaxTime = 300;

export class Store<
    Keys extends string | number,
    Axes extends string | number = null,
> extends EventEmitter<{
    [EVENTS.keydown]: (key: Keys) => void,
    [EVENTS.keyup]: (key: Keys) => void,
    [EVENTS.click]: (key: Keys) => void,

    [EVENTS.axismove]: (axis: Axes, value: number) => void,
}> {
    protected axes = new Map<Axes, number>();
    protected keys = new Map<Keys, number>();
    protected axesMultipliers = new Map<Axes, number>();
    protected keysMultipliers = new Map<Keys, number>();
    protected keysDownTime = new Map<Keys, number>();

    readonly events = EVENTS;


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

            if (lastValue === 0) {
                this.emit(EVENTS.keyup, key);

                if (Date.now() - (this.keysDownTime.get(key) || 0) < clickMaxTime) {
                    this.emit(EVENTS.click, key);
                }
            } else {
                this.keysDownTime.set(key, Date.now());
                this.emit(EVENTS.keydown, key);
            }
        }
    }

    private _updateAxis(key: Axes, value = 0) {
        value *= this.axesMultipliers.get(key) ?? 1;

        this.axes.set(key, value);
        this.emit(EVENTS.axismove, key, value);
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

store.addListener(EVENTS.click, (key) => console.log(key));
