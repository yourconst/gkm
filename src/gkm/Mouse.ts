import { Focusing } from "../helpers/Focusing";
import { Store } from "../helpers/Store";

export type MouseButtons = `MOUSE_${'LEFT'|'WHEEL'|'RIGHT'}`;

export type MouseAxes = `MOUSE_${
    'X'|'Y'|'MOVEMENT_X'|'MOVEMENT_Y'|
    'CLIENT_X'|'CLIENT_Y'|'OFFSET_X'|'OFFSET_Y'|
    'PAGE_X'|'PAGE_Y'|'SCREEN_X'|'SCREEN_Y'|
    'WHEEL_X'|'WHEEL_Y'|'WHEEL_Z'
}`;

const axisMap = new Map<MouseAxes, keyof MouseEvent>([
    ['MOUSE_X', 'x'],['MOUSE_Y', 'y'],['MOUSE_MOVEMENT_X', 'movementX'],['MOUSE_MOVEMENT_Y', 'movementY'],
    ['MOUSE_CLIENT_X', 'clientX'],['MOUSE_CLIENT_Y', 'clientY'],
    ['MOUSE_OFFSET_X', 'offsetX'],['MOUSE_OFFSET_Y', 'offsetY'],
    ['MOUSE_PAGE_X', 'pageX'],['MOUSE_PAGE_Y', 'pageY'],
    ['MOUSE_SCREEN_X', 'screenX'],['MOUSE_SCREEN_Y', 'screenY'],
]);

export class Mouse extends Store<MouseButtons, MouseAxes, Mouse> {

    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        super();

        this.target.addEventListener('mousemove', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            for (const [axis, prop] of axisMap.entries()) {
                const value: number = <any> event[prop];

                if (value !== undefined) {
                    this.updateAxis(axis, value, this);
                }
            }
        });

        this.target.addEventListener('wheel', (event) => {
            this.updateAxis('MOUSE_WHEEL_X', event.deltaX, this);
            this.updateAxis('MOUSE_WHEEL_Y', event.deltaY, this);
            this.updateAxis('MOUSE_WHEEL_Z', event.deltaZ, this);
        });

        this.target.addEventListener('mousedown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.keydown('MOUSE_LEFT', this);
            } else
            if (event.button === 1) {
                this.keydown('MOUSE_WHEEL', this);
            } else
            if (event.button === 2) {
                this.keydown('MOUSE_RIGHT', this);
            }
        });

        this.target.addEventListener('mouseup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }

            if (event.button === 0) {
                this.keyup('MOUSE_LEFT', this);
            } else
            if (event.button === 1) {
                this.keyup('MOUSE_WHEEL', this);
            } else
            if (event.button === 2) {
                this.keyup('MOUSE_RIGHT', this);
            }
        });

        Focusing.addListener(this.target, 'blur', () => {
            this.reset(this);
        });
    }

    get name() {
        return 'Mouse';
    }
}
