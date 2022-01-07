import React from "react";
import VLEC from "../../Assets/img/Virginia_Lyons_H.svg";
import CAMBRIDGE from "../../Assets/img/Cambridge_Platinum_Exam_Centre.svg";
const Header = () => {
  return (
    <header className="app-header">
      <img src={VLEC} alt="Virginia Lyons Exam Centre" />
      <img src={CAMBRIDGE} alt="Authorized Platinum Exam Centre" />
    </header>
  );
};

export default Header;
