import EventEmitter from "eventemitter3";
import { Gamepad, GamepadAxes, GamepadButtons, GamepadVibrateOptions } from "./gkm/Gamepad";
import { Keyboard, KeyboardButtons } from "./gkm/Keyboard";
import { Mouse, MouseAxes, MouseButtons } from "./gkm/Mouse";
import { Store } from "./helpers/Store";

enum GKMEvents {
    gamepadconnected = 'gamepadconnected',
    gamepadreconnected = 'gamepadreconnected',
    gamepaddisconnected = 'gamepaddisconnected',
}

export class GKM<CustomKeys extends string = null, CustomAxes extends string = null> extends EventEmitter<{
    [GKMEvents.gamepadconnected]: (gamepad: Gamepad) => void,
    [GKMEvents.gamepaddisconnected]: (gamepad: Gamepad) => void,
    [GKMEvents.gamepadreconnected]: (gamepad: Gamepad) => void,
}> {
    readonly store = new Store<
        CustomKeys | GamepadButtons |KeyboardButtons | MouseButtons,
        CustomAxes | GamepadAxes | MouseAxes
    >();
    
    readonly mouse: Mouse;
    readonly keyboard: Keyboard;
    readonly gamepads = new Map<number, Gamepad>();

    readonly usedGamepadsIndexes = new Set<number>();

    constructor(private target: HTMLElement = document.body, private needPreventDefault = false) {
        super();
        
        this.mouse = new Mouse(target, needPreventDefault);
        this.keyboard = new Keyboard(target, needPreventDefault);

        this.mouse.store.addListener(Store.events.keyvaluechange, (key, value) => {
            this.store.updateKey(key, value);
        });

        this.mouse.store.addListener(Store.events.axismove, (key, value) => {
            this.store.updateAxis(key, value);
        });

        this.keyboard.store.addListener(Store.events.keyvaluechange, (key, value) => {
            this.store.updateKey(key, value);
        });

        Gamepad.addListener(Gamepad.events.connected, () => {
            this.checkGamepads();
        });

        this.checkGamepads();
    }

    tryAddGamepad(index: number) {
        if (this.gamepads.has(index)) {
            return;
        }

        const gamepad = new Gamepad({
            index,
            usedGamepadsIndexes: this.usedGamepadsIndexes,
            autoUpdate: false,
        });

        gamepad.addListener(gamepad.events.connected, gp => {
            this.emit(GKMEvents.gamepadconnected, gp);
        });

        gamepad.addListener(gamepad.events.disconnected, gp => {
            this.emit(GKMEvents.gamepaddisconnected, gp);
        });

        gamepad.store.addListener(Store.events.keyvaluechange, (key, value) => {
            this.store.updateKey(key, value);
        });

        gamepad.store.addListener(Store.events.axismove, (key, value) => {
            this.store.updateAxis(key, value);
        });

        this.gamepads.set(index, gamepad);
    }

    checkGamepads() {
        const allgps = Gamepad.getActiveLlgps();

        for (const llgp of allgps) {
            this.tryAddGamepad(llgp.index);
        }
    }


    async vibrate(options: GamepadVibrateOptions) {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.vibrate(options)));
    }

    async stopVibration() {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.stopVibration()));
    }
}
