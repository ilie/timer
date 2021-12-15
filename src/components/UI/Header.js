import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons.png";
import CAMBRIDGE from "../../Assets/img/Cambridge_Platinum_Centre_2.png";
const Header = () => {
  return (
    <header className="app-header">
      <img src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img src={CAMBRIDGE} alt="Authorized Platinum Exam Centre" />
    </header>
  );
};

export default Header;
