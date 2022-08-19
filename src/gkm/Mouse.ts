import { Store } from "../helpers/Store";

enum MouseButtons {
    Left = 'Left',
    Middle = 'Middle',
    Right = 'Right',
}

enum MouseAxes {
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

    readonly store = new Store<MouseButtons, MouseAxes>();

    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        target.addEventListener('mousemove', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            for (const axis of Object.values(MouseAxes)) {
                this.store.updateAxis(axis, event[axis]);
            }
        });

        target.addEventListener('mousedown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.store.keydown(MouseButtons.Left);
            } else
            if (event.button === 1) {
                this.store.keydown(MouseButtons.Middle);
            } else
            if (event.button === 2) {
                this.store.keydown(MouseButtons.Right);
            }
        });

        target.addEventListener('mouseup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.store.keyup(MouseButtons.Left);
            } else
            if (event.button === 1) {
                this.store.keyup(MouseButtons.Middle);
            } else
            if (event.button === 2) {
                this.store.keyup(MouseButtons.Right);
            }
        });

        target.addEventListener('focusout', () => {
            this.store.clear();
        });
    }
}
