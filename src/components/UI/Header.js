import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Authorised-Platinum-Exam-centre-logo.svg";
const Header = () => {
  return (
    <header className="app-header">
      <img src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img
        src={CAMBRIDGE}
        alt="Authorized Platinum Exam Centre"
        height="125px"
        width="344px"
      />
    </header>
  );
};

export default Header;
