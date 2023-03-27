import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Authorised-Platinum-Centre_Logo_RGB_OUTLINED.svg";
import CAMBRIDGE23 from "../../Assets/img/Cambridge_Platinum_Centre_2023.svg";
const Header = () => {
  return (
    <header className="app-header">
      <img src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img
        className="cambridge-logo"
        src={CAMBRIDGE23}
        alt="Authorized Platinum Exam Centre"
        height="125px"
        // width="344px"
      />
    </header>
  );
};

export default Header;
