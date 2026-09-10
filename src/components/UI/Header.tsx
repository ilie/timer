import type { ReactElement } from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Cambridge_Platinum_Centre_2023.svg";

const HEADER_CLASSES = "flex shrink-0 items-center justify-between gap-8 bg-white px-8 py-2";

const VLEC_LOGO_CLASSES = "h-[17vh] max-h-60 w-auto";

const CAMBRIDGE_LOGO_CLASSES = "h-[15vh] max-h-52 w-auto";

function Header(): ReactElement {
  return (
    <header className={HEADER_CLASSES}>
      {/* The board itself carries no heading, so this names the page for screen readers. */}
      <h1 className="sr-only">Exam countdown board — Virginia Lyons Exam Centre</h1>
      <img
        className={VLEC_LOGO_CLASSES}
        src={VLEC}
        alt="Virginia Lyons Exam Centre"
        width={236}
        height={125}
      />
      <img
        className={CAMBRIDGE_LOGO_CLASSES}
        src={CAMBRIDGE}
        alt="Authorised Platinum Exam Centre"
        width={1415}
        height={689}
      />
    </header>
  );
}

export default Header;
