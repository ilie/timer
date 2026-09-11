import '@testing-library/jest-dom/vitest';

const dialogPrototype = HTMLDialogElement.prototype;

if (typeof dialogPrototype.showModal !== 'function') {
    dialogPrototype.showModal = function showModal(this: HTMLDialogElement) {
        if (this.hasAttribute('open')) {
            throw new DOMException('The dialog is already open', 'InvalidStateError');
        }
        this.setAttribute('open', '');
    };
    dialogPrototype.show = function show(this: HTMLDialogElement) {
        this.setAttribute('open', '');
    };
    dialogPrototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
        if (returnValue !== undefined) {
            this.returnValue = returnValue;
        }
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
    };
}
