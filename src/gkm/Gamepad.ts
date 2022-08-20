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


export type GamepadMappedButtons = 
    'A'|'X'|'Y'|'B' |
    'DOWN'|'LEFT'|'UP'|'RIGHT' |
    'START'|'BACK'|'GUIDE' |
    'STICK_LEFT'|'STICK_RIGHT' |
    'BUMPER_LEFT'|'BUMPER_RIGHT' |
    'TRIGGER_LEFT'|'TRIGGER_RIGHT'
;
export type GamepadUnnamedButtons = `BUTTON_${number}`;

export type GamepadButtons = GamepadUnnamedButtons | GamepadMappedButtons;


export type GamepadMappedAxes = 
    'STICK_LEFT_X'|'STICK_LEFT_Y' |
    'STICK_RIGHT_X'|'STICK_RIGHT_Y'
;
export type GamepadUnnamedAxes = `AXIS_${number}`;

export type GamepadAxes = GamepadUnnamedAxes | GamepadMappedAxes;


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

    private _isTargetInFocus = true;

    constructor(
        private target: HTMLElement = document.body,
        {
            index = null,
            autoUpdate = true,
            usedGamepadsIndexes = globalUsedGamepadsIndexes,
        }: {
            index?: number;
            autoUpdate?: boolean;
            usedGamepadsIndexes?: Set<number>;
        }
    ) {
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

        // TODO
        target.addEventListener('focus', (event) => {
            this._isTargetInFocus = true;
            console.log(event);
        });

        target.addEventListener('focusin', (event) => {
            this._isTargetInFocus = true;
            console.log(event);
        });

        target.addEventListener('focusout', (event) => {
            this._isTargetInFocus = false;
            console.log(event);
        });

        this.store.bindKeys({
            'BUTTON_0': 'A',
            'BUTTON_1': 'B',
            'BUTTON_2': 'X',
            'BUTTON_3': 'Y',
            'BUTTON_4': 'BUMPER_LEFT',
            'BUTTON_5': 'BUMPER_RIGHT',
            'BUTTON_6': 'TRIGGER_LEFT',
            'BUTTON_7': 'TRIGGER_RIGHT',
            'BUTTON_8': 'BACK',
            'BUTTON_9': 'START',
            'BUTTON_10': 'STICK_LEFT',
            'BUTTON_11': 'STICK_RIGHT',
            'BUTTON_12': 'UP',
            'BUTTON_13': 'DOWN',
            'BUTTON_14': 'LEFT',
            'BUTTON_15': 'RIGHT',
            'BUTTON_16': 'GUIDE',
        });

        this.store.bindAxes({
            'AXIS_0': 'STICK_LEFT_X',
            'AXIS_1': 'STICK_LEFT_Y',
            'AXIS_2': 'STICK_RIGHT_X',
            'AXIS_3': 'STICK_RIGHT_Y',
        });

        this.tryInit();
    }

    get isTargetInFocus() {
        return document.hasFocus() && this._isTargetInFocus;
    }

    get index() {
        return this._index;
    }
    private set index(value) {
        if (this._index === value) {
            return;
        }

        if (value !== null && typeof value !== 'number') {
            throw new Error(`Bad index value "${value}"`);
        }

        if (this.usedGamepadsIndexes?.has(value)) {
            throw new Error(`Index "${value}" already used`);
        }

        if (typeof this._index === 'number') {
            this.usedGamepadsIndexes?.delete(this._index);
        }

        this._index = value;

        if (this._index !== null) {
            this.usedGamepadsIndexes?.add(this._index);
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

    get name() {
        return this.llgp?.id;
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
            if (!this.usedGamepadsIndexes?.has(llgp.index)) {
                this.index = llgp.index;
                this.connected = true;
            }
        }
    }

    readonly update = (llgp = this.getLlgp()) => {
        this.llgp = llgp;

        if (!this.connected || !this.isTargetInFocus) {
            return;
        }

        for (const [i, value] of this.llgp.axes.entries()) {
            this.store.updateAxis(`AXIS_${i}`, value, this);
        }

        for (const [i, value] of this.llgp.buttons.entries()) {
            this.store.updateKey(
                `BUTTON_${i}`,
                typeof value === 'number' ? value : value.value || Number(value.pressed),
                this,
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
