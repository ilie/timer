import type { ReactElement } from "react";

const FOOTER_CLASSES = "shrink-0 bg-white px-8 py-2";

const LINK_CLASSES =
  "text-sm text-linguaskill-slate-500 no-underline transition-colors hover:text-linguaskill-slate-700";

function Footer(): ReactElement {
  const fullYear = new Date().getFullYear();

  return (
    <footer className={FOOTER_CLASSES}>
      <p>
        <a className={LINK_CLASSES} href="https://www.vlec.es" rel="noreferrer">
          Virginia Lyons Exam Centre © {fullYear}
        </a>
      </p>
    </footer>
  );
}

export default Footer;
