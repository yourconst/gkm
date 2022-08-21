export class Focusing {
    static addListener(target: HTMLElement, event: 'focus' | 'blur', listener: () => void) {
        const realTarget = target === document.body ? window : target;

        if (event === 'focus') {
            realTarget.addEventListener('focus', listener);
        } else if (event === 'blur') {
            realTarget.addEventListener('blur', listener);
        } else {
            throw new Error(`Bad focusing event name "${event}"`);
        }
    }
}
