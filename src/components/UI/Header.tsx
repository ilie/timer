import { mergeClasses } from '../../lib/mergeClasses';
import type { ReactElement } from 'react';
import virginiaLyonsLogo from '../../Assets/img/Virginia_Lyons_H.svg';
import cambridgeLogo from '../../Assets/img/Cambridge_Platinum_Centre_2023.svg';

type HeaderProps = {
    className?: string;
};

function Header({ className }: HeaderProps): ReactElement {
    return (
        <header
            className={mergeClasses('flex shrink-0 items-center justify-between gap-8 bg-white px-8 py-2', className)}
        >
            {/* The board itself carries no heading, so this names the page for screen readers. */}
            <h1 className="sr-only">Exam countdown board — Virginia Lyons Exam Centre</h1>
            <img
                className="h-[17vh] max-h-60 w-auto"
                src={virginiaLyonsLogo}
                alt="Virginia Lyons Exam Centre"
                width={236}
                height={125}
            />
            <img
                className="h-[15vh] max-h-52 w-auto"
                src={cambridgeLogo}
                alt="Authorised Platinum Exam Centre"
                width={1415}
                height={689}
            />
        </header>
    );
}

export default Header;
