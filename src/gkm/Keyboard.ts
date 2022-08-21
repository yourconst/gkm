import { Focusing } from "../helpers/Focusing";
import { Store } from "../helpers/Store";

export type KeyboardButtons =
    `Key${'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'|'M'|'N'|'O'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'}` |
    `Digit${0|1|2|3|4|5|6|7|8|9}` |
    `F${0|1|2|3|4|5|6|7|8|9}` |
    `Arrow${'Down'|'Left'|'Up'|'Right'}` |
    'ControlLeft' | 'ControlRight' |
    'AltLeft' | 'AltRight' |
    'ShiftLeft' | 'ShiftrIGHT' |
    'Escape' | 'ContextMenu' | 'Backquote' | 'Quote' | 'Tab' | 'CapsLock' | 'Backspace' | 'Enter' |
    'Insert' | 'Home' | 'PageUp' | 'PageDown' | 'End' | 'Delete' |
    'ScrollLock' | 'Pause' |
    'Comma' | 'Period' | 'Slash' | 'Semicolon' | 'Quote' | 'BracketLeft' | 'BracketRight' | 'Minus' | 'Equal'
;

export class Keyboard extends Store<KeyboardButtons, null, Keyboard> {
    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        super();

        this.target.addEventListener('keydown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.keydown(<KeyboardButtons> event.code, this);
        });
        this.target.addEventListener('keyup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.keyup(<KeyboardButtons> event.code, this);
        });

        Focusing.addListener(this.target, 'blur', () => {
            this.reset(this);
        });
    }

    get name() {
        return 'Keyboard';
    }
}
