import { describe, expect, it } from 'vitest';
import { mergeClasses } from './mergeClasses';

describe('merging classes against this project theme', () => {
    // The board's own font sizes look like colour utilities. Left unconfigured,
    // tailwind-merge drops the text colour and the button loses its contrast.
    it.each(['text-tab', 'text-centre-number', 'text-control'])(
        'keeps the text colour when %s sets the size',
        (size) => {
            expect(mergeClasses('bg-vlec-blue-900 text-white', size)).toContain('text-white');
        },
    );

    it('still lets a real colour override an earlier one', () => {
        expect(mergeClasses('text-white', 'text-vlec-blue-900')).toBe('text-vlec-blue-900');
    });

    it('still lets a later font size win over an earlier one', () => {
        expect(mergeClasses('text-tab', 'text-control')).toBe('text-control');
    });

    it('keeps a size and a colour together whichever order they arrive in', () => {
        expect(mergeClasses('text-control', 'text-white')).toBe('text-control text-white');
    });
});
