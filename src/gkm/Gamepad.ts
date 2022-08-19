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


// TODO


export class Gamepad {
    readonly store = new Store<string, string>();
    
    private llgp: LowLevelGamepad;

    constructor() {

        window.addEventListener('gamepadconnected', (event) => {
            event.gamepad
        });
    }
}
