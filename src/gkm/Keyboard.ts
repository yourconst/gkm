import { Store } from "../helpers/Store";

export class Keyboard {
    readonly store = new Store<string>();

    constructor(protected target: HTMLElement = document.body, public needPreventDefault = false) {
        target.addEventListener('keydown', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.store.keydown(event.code);
        });
        target.addEventListener('keyup', (event) => {
            if (this.needPreventDefault) {
                event.preventDefault();
            }
            this.store.keyup(event.code);
        });

        target.addEventListener('focusout', () => {
            this.store.clear();
        });
    }
}
