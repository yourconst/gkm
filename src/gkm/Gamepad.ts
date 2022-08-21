import EventEmitter from "eventemitter3";
import { Focusing } from "../helpers/Focusing";
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


export type GamepadEvents = 'connected' | 'disconnected';


export type GamepadMappedButtons = `GAMEPAD_${
    'A'|'X'|'Y'|'B' |
    'DOWN'|'LEFT'|'UP'|'RIGHT' |
    'START'|'BACK'|'GUIDE' |
    'STICK_LEFT'|'STICK_RIGHT' |
    'BUMPER_LEFT'|'BUMPER_RIGHT' |
    'TRIGGER_LEFT'|'TRIGGER_RIGHT'
}`;
export type GamepadUnnamedButtons = `BUTTON_${number}`;

export type GamepadButtons = GamepadUnnamedButtons | GamepadMappedButtons;


export type GamepadMappedAxes = `GAMEPAD_${
    'STICK_LEFT_X'|'STICK_LEFT_Y' |
    'STICK_RIGHT_X'|'STICK_RIGHT_Y'
}`;
export type GamepadUnnamedAxes = `GAMEPAD_AXIS_${number}`;

export type GamepadAxes = GamepadUnnamedAxes | GamepadMappedAxes;


const llgpee = new EventEmitter<{
    'connected': (gamepad: LowLevelGamepad) => void,
    'disconnected': (gamepad: LowLevelGamepad) => void,
}>();

window.addEventListener('gamepadconnected', ({ gamepad }) => {
    llgpee.emit('connected', <any> gamepad);
});

window.addEventListener('gamepaddisconnected', ({ gamepad }) => {
    llgpee.emit('disconnected', <any> gamepad);
});

const globalUsedGamepadsIndexes = new Set<number>();

const standardButtonsMapping = new Map<number, GamepadMappedButtons>([
    [0, 'GAMEPAD_A'],
    [1, 'GAMEPAD_B'],
    [2, 'GAMEPAD_X'],
    [3, 'GAMEPAD_Y'],
    [4, 'GAMEPAD_BUMPER_LEFT'],
    [5, 'GAMEPAD_BUMPER_RIGHT'],
    [6, 'GAMEPAD_TRIGGER_LEFT'],
    [7, 'GAMEPAD_TRIGGER_RIGHT'],
    [8, 'GAMEPAD_BACK'],
    [9, 'GAMEPAD_START'],
    [10, 'GAMEPAD_STICK_LEFT'],
    [11, 'GAMEPAD_STICK_RIGHT'],
    [12, 'GAMEPAD_UP'],
    [13, 'GAMEPAD_DOWN'],
    [14, 'GAMEPAD_LEFT'],
    [15, 'GAMEPAD_RIGHT'],
    [16, 'GAMEPAD_GUIDE'],
]);

const standardAxesMapping = new Map<number, GamepadMappedAxes>([
    [0, 'GAMEPAD_STICK_LEFT_X'],
    [1, 'GAMEPAD_STICK_LEFT_Y'],
    [2, 'GAMEPAD_STICK_RIGHT_X'],
    [3, 'GAMEPAD_STICK_RIGHT_Y'],
]);

export interface KeysAxesMapping<Keys, Axes> {
    buttons: Map<number, Keys>;
    axes: Map<number, Axes>;
}

function getAutoMappings(gamepad: LowLevelGamepad): KeysAxesMapping<GamepadButtons, GamepadAxes> {
    if (gamepad.mapping === 'standard') {
        return {
            buttons: standardButtonsMapping,
            axes: standardAxesMapping,
        };
    }

    return {
        buttons: new Map(gamepad.buttons.map((_,i) => ([i, `BUTTON_${i}`]))),
        axes: new Map(gamepad.axes.map((_,i) => ([i, `GAMEPAD_AXIS_${i}`]))),
    }
}

export class Gamepad<Keys extends string = GamepadButtons, Axes extends string = GamepadAxes>
extends Store<Keys, Axes, Gamepad<Keys, Axes>, {
    ['connected']: (gamepad: Gamepad) => void,
    ['disconnected']: (gamepad: Gamepad) => void,
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

    private llgp?: LowLevelGamepad;
    private autoUpdate = true;
    private _connected = false;
    private _index: number = null;
    private usedGamepadsIndexes?: Set<number>;

    private buttonsMapping: Map<number, Keys>;
    private axesMapping: Map<number, Axes>;

    private getMappings: (gamepad: LowLevelGamepad) => KeysAxesMapping<Keys, Axes>;

    private _isTargetInFocus = true;

    constructor(
        private target: HTMLElement = document.body,
        {
            index = null,
            autoUpdate = true,
            usedGamepadsIndexes = globalUsedGamepadsIndexes,
            // @ts-ignore
            getMappings = getAutoMappings,
        }: {
            index?: number;
            autoUpdate?: boolean;
            usedGamepadsIndexes?: Set<number>;
            getMappings?: (gamepad: LowLevelGamepad) => KeysAxesMapping<Keys, Axes>,
        }
    ) {
        super();

        this.index = index;
        this.autoUpdate = autoUpdate;
        this.usedGamepadsIndexes = usedGamepadsIndexes;
        this.getMappings = getMappings;

        Gamepad.addListener('connected', () => {
            this.tryInit();
        });

        Gamepad.addListener('disconnected', (gamepad) => {
            if (gamepad.index === this.index) {
                this.connected = false;
            }
        });

        Focusing.addListener(this.target, 'focus', () => {
            this._isTargetInFocus = true;
        });
        Focusing.addListener(this.target, 'blur', () => {
            this.reset(this);
            this._isTargetInFocus = false;
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
            this.llgp = this.getLlgp();
            const { buttons, axes } = this.getMappings(this.llgp);
            this.buttonsMapping = buttons;
            this.axesMapping = axes;
            // @ts-ignore
            this.emit('connected', this);
        } else {
            // @ts-ignore
            this.emit('disconnected', this);
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
            this.updateAxis(this.axesMapping.get(i), value, this);
        }

        for (const [i, value] of this.llgp.buttons.entries()) {
            this.updateKey(
                this.buttonsMapping.get(i),
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
