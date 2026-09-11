import type { ReactElement, Ref } from 'react';
import { FileText, Monitor } from 'lucide-react';
import { mergeClasses } from '../lib/mergeClasses';
import { DialogError, DialogHint } from './DialogField';
import type { Mode } from '../config/exams';

type ModeFieldProps = {
    /** The formats this exam offers, empty until an exam is chosen. */
    availableModes: readonly Mode[];
    selected: Mode | '';
    /** True before an exam is chosen, when there is nothing to offer yet. */
    waiting: boolean;
    invalid: boolean;
    errorId: string;
    groupName: string;
    firstOptionRef: Ref<HTMLInputElement>;
    onChange: (mode: Mode) => void;
    onBlur: () => void;
    className?: string;
};

const modeLabels: Record<Mode, string> = {
    paper: 'Paper',
    digital: 'Digital',
};

/** Paper or on screen, as a radio group whose error belongs to the group. */
export function ModeField({
    availableModes,
    selected,
    waiting,
    invalid,
    errorId,
    groupName,
    firstOptionRef,
    onChange,
    onBlur,
    className,
}: ModeFieldProps): ReactElement {
    return (
        <fieldset
            className={mergeClasses('flex flex-col gap-2 border-0 p-0', className)}
            onBlur={onBlur}
            aria-describedby={invalid ? errorId : undefined}
        >
            <legend className="text-linguaskill-slate-700 mb-2 text-base font-medium">Format</legend>
            <div className="flex flex-wrap gap-3">
                {availableModes.map((mode, index) => (
                    <label
                        key={mode}
                        className={mergeClasses(
                            'inline-flex items-center gap-3 rounded-lg px-4 py-3 text-lg',
                            waiting
                                ? 'border-linguaskill-slate-200 bg-linguaskill-slate-50 text-linguaskill-slate-400 cursor-not-allowed border'
                                : 'has-checked:border-vlec-blue-900 has-checked:bg-vlec-blue-50 has-checked:text-vlec-blue-900 has-focus-visible:outline-vlec-blue-700 cursor-pointer transition-colors has-checked:font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-2',
                            !waiting &&
                                (invalid
                                    ? 'border-vlec-red-700 border-2'
                                    : 'border-linguaskill-slate-300 hover:border-linguaskill-slate-400 border'),
                        )}
                    >
                        <input
                            className="accent-vlec-blue-900 size-5"
                            ref={index === 0 ? firstOptionRef : undefined}
                            type="radio"
                            name={groupName}
                            value={mode}
                            checked={selected === mode}
                            onChange={() => {
                                onChange(mode);
                            }}
                            disabled={waiting}
                            required
                            aria-invalid={invalid}
                        />
                        {mode === 'paper' ? (
                            <FileText className="size-[1em] shrink-0" aria-hidden="true" />
                        ) : (
                            <Monitor className="size-[1em] shrink-0" aria-hidden="true" />
                        )}
                        {modeLabels[mode]}
                    </label>
                ))}
            </div>
            {waiting && <DialogHint>The formats on offer depend on the exam.</DialogHint>}
            {invalid && <DialogError id={errorId}>Say whether this session is on paper or on screen.</DialogError>}
        </fieldset>
    );
}
