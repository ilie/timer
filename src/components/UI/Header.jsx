import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Authorised-Platinum-Centre_Logo_RGB_OUTLINED.svg";
import CAMBRIDGE23 from "../../Assets/img/Cambridge_Platinum_Centre_2023.svg";
const Header = () => {
  return (
    <header className="app-header">
      <img className="h-[125px] w-auto" src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img
        className="cambridge-logo h-[125px] w-auto"
        src={CAMBRIDGE23}
        alt="Authorized Platinum Exam Centre"
      />
    </header>
  );
};

export default Header;
