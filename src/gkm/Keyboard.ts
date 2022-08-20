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

export class Keyboard {
    readonly store = new Store<KeyboardButtons, null, Keyboard>();

    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        target.addEventListener('keydown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.store.keydown(<KeyboardButtons> event.code, this);
        });
        target.addEventListener('keyup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.store.keyup(<KeyboardButtons> event.code, this);
        });

        // TODO
        target.addEventListener('focusout', () => {
            this.store.clear();
        });
    }

    get name() {
        return 'Keyboard';
    }
}
