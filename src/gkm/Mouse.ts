import { Store } from "../helpers/Store";

export enum MouseButtons {
    MOUSE_LEFT = 'MOUSE_LEFT',
    MOUSE_MIDDLE = 'MOUSE_MIDDLE',
    MOUSE_RIGHT = 'MOUSE_RIGHT',
}

export enum MouseAxes {
    clientX = 'clientX',
    clientY = 'clientY',
    offsetX = 'offsetX',
    offsetY = 'offsetY',
    pageX = 'pageX',
    pageY = 'pageY',
    screenX = 'screenX',
    screenY = 'screenY',
    movementX = 'movementX',
    movementY = 'movementY',
    x = 'x',
    y = 'y',
}


export class Mouse {
    readonly buttons = MouseButtons;
    readonly axes = MouseAxes;

    readonly store = new Store<MouseButtons, MouseAxes, Mouse>();

    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        target.addEventListener('mousemove', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            for (const axis of Object.values(MouseAxes)) {
                this.store.updateAxis(axis, event[axis], this);
            }
        });

        target.addEventListener('mousedown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.store.keydown(MouseButtons.MOUSE_LEFT, this);
            } else
            if (event.button === 1) {
                this.store.keydown(MouseButtons.MOUSE_MIDDLE, this);
            } else
            if (event.button === 2) {
                this.store.keydown(MouseButtons.MOUSE_RIGHT, this);
            }
        });

        target.addEventListener('mouseup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.store.keyup(MouseButtons.MOUSE_LEFT, this);
            } else
            if (event.button === 1) {
                this.store.keyup(MouseButtons.MOUSE_MIDDLE, this);
            } else
            if (event.button === 2) {
                this.store.keyup(MouseButtons.MOUSE_RIGHT, this);
            }
        });

        // TODO
        target.addEventListener('focusout', () => {
            this.store.clear();
        });
    }

    get name() {
        return 'Mouse';
    }
}
