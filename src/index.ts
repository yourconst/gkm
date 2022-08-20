import EventEmitter from "eventemitter3";
import { Gamepad, GamepadAxes, GamepadButtons, GamepadVibrateOptions } from "./gkm/Gamepad";
import { Keyboard, KeyboardButtons } from "./gkm/Keyboard";
import { Mouse, MouseAxes, MouseButtons } from "./gkm/Mouse";
import { Store, StoreEvents } from "./helpers/Store";

export { Gamepad, GamepadAxes, GamepadButtons, GamepadVibrateOptions } from "./gkm/Gamepad";
export { Keyboard, KeyboardButtons } from "./gkm/Keyboard";
export { Mouse, MouseAxes, MouseButtons } from "./gkm/Mouse";
export { Store, StoreEvents } from "./helpers/Store";

export enum GKMEvents {
    gamepadconnected = 'gamepadconnected',
    gamepadreconnected = 'gamepadreconnected',
    gamepaddisconnected = 'gamepaddisconnected',
}

export class GKM<CustomKeys extends string = null, CustomAxes extends string = null> extends EventEmitter<{
    [GKMEvents.gamepadconnected]: (gamepad: Gamepad) => void,
    [GKMEvents.gamepaddisconnected]: (gamepad: Gamepad) => void,
    [GKMEvents.gamepadreconnected]: (gamepad: Gamepad) => void,
}> {
    static readonly events = GKMEvents;

    readonly events = GKMEvents;

    readonly store = new Store<
        CustomKeys | GamepadButtons |KeyboardButtons | MouseButtons,
        CustomAxes | GamepadAxes | MouseAxes,
        Gamepad | Keyboard | Mouse
    >();
    
    readonly mouse: Mouse;
    readonly keyboard: Keyboard;
    readonly gamepads = new Map<number, Gamepad>();

    readonly usedGamepadsIndexes = new Set<number>();

    private gamepadsUpdateIntervalEntity: number;

    constructor(
        private target: HTMLElement = document.body,
        private needPreventDefault = false,
        private gamepadsUpdateInterval = 8,
    ) {
        super();
        
        this.mouse = new Mouse(this.target, this.needPreventDefault);
        this.keyboard = new Keyboard(this.target, this.needPreventDefault);

        this.mouse.store.addListener(Store.events.keyvaluechange, (key, value, source) => {
            this.store.updateKey(key, value, source);
        });

        this.mouse.store.addListener(Store.events.axismove, (key, value, source) => {
            this.store.updateAxis(key, value, source);
        });

        this.keyboard.store.addListener(Store.events.keyvaluechange, (key, value, source) => {
            this.store.updateKey(key, value, source);
        });

        Gamepad.addListener(Gamepad.events.connected, () => {
            this.checkGamepads();
        });

        this.checkGamepads();

        this.gamepadsUpdateIntervalEntity = setInterval(this.updateGamepads, this.gamepadsUpdateInterval);
    }

    tryAddGamepad(index: number) {
        if (this.gamepads.has(index)) {
            return;
        }

        const gamepad = new Gamepad(this.target, {
            index,
            usedGamepadsIndexes: this.usedGamepadsIndexes,
            autoUpdate: false,
        });

        gamepad.addListener(gamepad.events.connected, gp => {
            this.emit(GKMEvents.gamepadreconnected, gp);
        });

        gamepad.addListener(gamepad.events.disconnected, gp => {
            this.emit(GKMEvents.gamepaddisconnected, gp);
        });

        gamepad.store.addListener(Store.events.keyvaluechange, (key, value, source) => {
            this.store.updateKey(key, value, source);
        });

        gamepad.store.addListener(Store.events.axismove, (key, value, source) => {
            this.store.updateAxis(key, value, source);
        });

        this.gamepads.set(index, gamepad);

        this.emit(GKMEvents.gamepadconnected, gamepad);
    }

    checkGamepads() {
        const allgps = Gamepad.getActiveLlgps();

        for (const llgp of allgps) {
            this.tryAddGamepad(llgp.index);
        }
    }

    private readonly updateGamepads = () => {
        for (const gamepad of this.gamepads.values()) {
            gamepad.update();
        }
    };


    async vibrate(options: GamepadVibrateOptions) {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.vibrate(options)));
    }

    async stopVibration() {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.stopVibration()));
    }
}
