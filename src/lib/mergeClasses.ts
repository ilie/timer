import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes, with this project's theme taught to the merger.
 *
 * The theme adds three font sizes of its own (`text-tab`, `text-centre-number`,
 * `text-control`). tailwind-merge has no way to know those are sizes rather
 * than colours, so left to itself it treats `text-control` as conflicting with
 * `text-white` and silently drops the colour — which is how the Pause button
 * ended up with dark text on a dark background.
 *
 * Any font size added to `@theme` in styles.css has to be listed here too.
 */
export const mergeClasses = extendTailwindMerge({
    extend: {
        classGroups: {
            'font-size': [{ text: ['tab', 'centre-number', 'control'] }],
        },
    },
});
