import EventEmitter from "eventemitter3";
import { Store } from "../helpers/Store";


interface LowLevelVibrationActuator {
    reset: () => Promise<void>;
    playEffect: (
        type: 'dual-rumble',
        options: {
            startDelay: number;
            duration: number;
            weakMagnitude: number;
            strongMagnitude: number;
        },
    ) => Promise<void>;
}

interface LowLevelGamepadButton {
    value: number;
    pressed: boolean;
    touched?: boolean;
}

interface LowLevelGamepad {
    id: string;
    index: number;
    mapping: 'standard' | '';
    connected: boolean;
    axes: number[];
    buttons: (number | LowLevelGamepadButton)[];
    timestamp: number;
    vibrationActuator?: LowLevelVibrationActuator;
}


export interface GamepadVibrateOptions {
    duration: number;
    startDelay?: number;
    weakMagnitude?: number;
    strongMagnitude?: number;
}


export enum GamepadEvents {
    connected = 'connected',
    disconnected = 'disconnected',
}

export type GamepadButtons = `BUTTON_${number}`;
export type GamepadAxes = `AXIS_${number}`;


const llgpee = new EventEmitter<{
    [GamepadEvents.connected]: (gamepad: LowLevelGamepad) => void,
    [GamepadEvents.disconnected]: (gamepad: LowLevelGamepad) => void,
}>();

window.addEventListener('gamepadconnected', ({ gamepad }) => {
    llgpee.emit(GamepadEvents.connected, <any> gamepad);
});

window.addEventListener('gamepaddisconnected', ({ gamepad }) => {
    llgpee.emit(GamepadEvents.disconnected, <any> gamepad);
});

const globalUsedGamepadsIndexes = new Set<number>();

export class Gamepad extends EventEmitter<{
    [GamepadEvents.connected]: (gamepad: Gamepad) => void,
    [GamepadEvents.disconnected]: (gamepad: Gamepad) => void,
}> {
    static readonly addListener: typeof llgpee['addListener'] =
        (event, listener) => llgpee.addListener(event, listener);

    static readonly removeListener: typeof llgpee['removeListener'] =
        (event, listener) => llgpee.removeListener(event, listener);


    static getLlgps(): LowLevelGamepad[] {
        return <any> window.navigator.getGamepads();
    }

    static getActiveLlgps() {
        return this.getLlgps().filter(llgp => llgp);
    }

    static readonly events = GamepadEvents;

    readonly events = GamepadEvents;

    readonly store = new Store<GamepadButtons, GamepadAxes>();    
    private llgp?: LowLevelGamepad;
    private autoUpdate = true;
    private _connected = false;
    private _index: number = null;
    private usedGamepadsIndexes?: Set<number>;

    constructor({
        index = null,
        autoUpdate = true,
        usedGamepadsIndexes = globalUsedGamepadsIndexes,
    }: {
        index?: number;
        autoUpdate?: boolean;
        usedGamepadsIndexes?: Set<number>;
    }) {
        super();

        this.index = index;
        this.autoUpdate = autoUpdate;
        this.usedGamepadsIndexes = usedGamepadsIndexes;

        Gamepad.addListener(GamepadEvents.connected, () => {
            this.tryInit();
        });

        Gamepad.addListener(GamepadEvents.disconnected, (gamepad) => {
            if (gamepad.index === this.index) {
                this.connected = false;
            }
        });

        this.tryInit();
    }

    get index() {
        return this._index;
    }
    set index(value) {
        if (this._index === value) {
            return;
        }

        if (value !== null && typeof value !== 'number') {
            throw new Error(`Bad index value "${value}"`);
        }

        if (this?.usedGamepadsIndexes.has(value)) {
            throw new Error(`Index "${value}" already used`);
        }

        if (typeof this._index === 'number') {
            this?.usedGamepadsIndexes.delete(this._index);
        }

        this._index = value;

        if (this._index !== null) {
            this.usedGamepadsIndexes.add(this._index);
        }
    }

    get connected() {
        return this._connected;
    }
    private set connected(value) {
        value = !!value;

        if (this._connected === value) {
            return;
        }

        this._connected = value;

        if (value) {
            this.emit(GamepadEvents.connected, this);
        } else {
            this.emit(GamepadEvents.disconnected, this);
            this.tryInit();
        }
    }

    get vibrationActuator() {
        return this.llgp?.vibrationActuator;
    }

    get canVibrate() {
        return this.connected && !!this.vibrationActuator;
    }

    getLlgp() {
        return Gamepad.getLlgps()[this.index];
    }

    tryInit() {
        if (this.connected) {
            return;
        }

        const llgps = Gamepad.getLlgps();

        if (typeof this.index === 'number') {
            if (llgps[this.index]) {
                this.connected = true;
            }

            return;
        }

        for (const llgp of llgps.filter(llgp => llgp)) {
            if (!this?.usedGamepadsIndexes?.has(llgp.index)) {
                this.index = llgp.index;
                this.connected = true;
            }
        }
    }

    readonly update = (llgp = this.getLlgp()) => {
        this.llgp = llgp;

        for (const [i, value] of this.llgp.axes.entries()) {
            this.store.updateAxis(`AXIS_${i}`, value);
        }

        for (const [i, value] of this.llgp.buttons.entries()) {
            this.store.updateKey(
                `BUTTON_${i}`,
                typeof value === 'number' ? value : value.value || Number(value.pressed),
            );
        }
    };

    async vibrate(options: GamepadVibrateOptions) {
        await this.vibrationActuator?.playEffect('dual-rumble', {
            startDelay: 0,
            weakMagnitude: 0,
            strongMagnitude: 0,
            ...options,
        });
    }

    async stopVibration() {
        await this.vibrationActuator?.reset();
    }
}
