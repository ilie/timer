import { twMerge } from 'tailwind-merge';
import type { ReactElement } from 'react';

type FooterProps = {
    className?: string;
};

function Footer({ className }: FooterProps): ReactElement {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={twMerge('shrink-0 bg-white px-8 py-2', className)}>
            <p>
                <a
                    className="text-linguaskill-slate-500 hover:text-linguaskill-slate-700 text-sm no-underline transition-colors"
                    href="https://www.vlec.es"
                    rel="noreferrer"
                >
                    Virginia Lyons Exam Centre © {currentYear}
                </a>
            </p>
        </footer>
    );
}

export default Footer;
