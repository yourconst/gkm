import EventEmitter from "eventemitter3";
import { Gamepad, GamepadAxes, GamepadButtons, GamepadVibrateOptions } from "./gkm/Gamepad";
import { Keyboard, KeyboardButtons } from "./gkm/Keyboard";
import { Mouse, MouseAxes, MouseButtons } from "./gkm/Mouse";
import { BinNextAxisInfo, BinNextKeyInfo, Store } from "./helpers/Store";

export { Gamepad, GamepadAxes, GamepadButtons, GamepadVibrateOptions } from "./gkm/Gamepad";
export { Keyboard, KeyboardButtons } from "./gkm/Keyboard";
export { Mouse, MouseAxes, MouseButtons } from "./gkm/Mouse";
export { Store, StoreEvents } from "./helpers/Store";

export type GKMEvents = 'gamepadconnected'|'gamepadreconnected'|'gamepaddisconnected';

export class GKM<
    CustomKeys extends string = null, CustomAxes extends string = null,
    Keys extends (CustomKeys | GamepadButtons | KeyboardButtons | MouseButtons) = CustomKeys | GamepadButtons | KeyboardButtons | MouseButtons,
    Axes extends (CustomAxes | GamepadAxes | MouseAxes) = CustomAxes | GamepadAxes | MouseAxes,
    Source extends (Gamepad | Keyboard | Mouse) = Gamepad | Keyboard | Mouse,
> extends Store<
    Keys,
    Axes,
    Source,
    {
        'gamepadconnected': (gamepad: Gamepad) => void,
        'gamepaddisconnected': (gamepad: Gamepad) => void,
        'gamepadreconnected': (gamepad: Gamepad) => void,
    }
> {
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

        this.mouse.addListener('keyvaluechange', (key, value, source) => {
            // @ts-ignore
            this.updateKey(key, value, source);
        });

        this.mouse.addListener('axismove', (key, value, source) => {
            // @ts-ignore
            this.updateAxis(key, value, source);
        });

        this.keyboard.addListener('keyvaluechange', (key, value, source) => {
            // @ts-ignore
            this.updateKey(key, value, source);
        });

        Gamepad.addListener('connected', () => {
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

        gamepad.addListener('connected', gp => {
            this.emit('gamepadreconnected', gp);
        });

        gamepad.addListener('disconnected', gp => {
            this.emit('gamepaddisconnected', gp);
        });

        gamepad.addListener('keyvaluechange', (key, value, source) => {
            // @ts-ignore
            this.updateKey(key, value, source);
        });

        gamepad.addListener('axismove', (key, value, source) => {
            // @ts-ignore
            this.updateAxis(key, value, source);
        });

        this.gamepads.set(index, gamepad);

        this.emit('gamepadconnected', gamepad);
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

    async bindNextKeySource(
        target: Keys,
        {
            validate = () => true,
            cancel = () => false,
        }: {
            validate?: (info: BinNextKeyInfo<Keys, Source>) => boolean;
            cancel?: (info: BinNextKeyInfo<Keys, Source>) => boolean;
        } = {},
    ) {
        let info: BinNextKeyInfo<Keys, Source>;

        do {
            info = await this.nextKeyBindAwaiter.wait();

            if (cancel(info)) {
                return null;
            }
        } while (info.key === target || !validate(info));

        // @ts-ignore
        info.source.bindKey(info.key, target, info.source);

        return info;
    }

    async bindNextAxisSource(
        target: Axes,
        {
            validate = () => true,
            cancel = () => false,
        }: {
            validate?: (info: BinNextAxisInfo<Axes, Source>) => boolean;
            cancel?: (info: BinNextAxisInfo<Axes, Source>) => boolean;
        } = {},
    ) {
        let info: BinNextAxisInfo<Axes, Source>;

        do {
            info = await this.nextAxisBindAwaiter.wait();

            if (cancel(info)) {
                return null;
            }
        } while (info.axis === target || !validate(info));

        // @ts-ignore
        info.source.bindKey(info.axis, target, info.source);

        return info;
    }


    async vibrate(options: GamepadVibrateOptions) {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.vibrate(options)));
    }

    async stopVibration() {
        await Promise.all([...this.gamepads.values()].map(gamepad => gamepad.stopVibration()));
    }
}
