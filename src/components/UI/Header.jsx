import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Authorised-Platinum-Centre_Logo_RGB_OUTLINED.svg";
import CAMBRIDGE23 from "../../Assets/img/Cambridge_Platinum_Centre_2023.svg";
const Header = () => {
  return (
    <header className="flex shrink-0 items-center justify-between gap-8 bg-white px-8 py-2">
      <img className="h-[17vh] max-h-60 w-auto" src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img
        className="h-[15vh] max-h-52 w-auto"
        src={CAMBRIDGE23}
        alt="Authorized Platinum Exam Centre"
      />
    </header>
  );
};

export default Header;
