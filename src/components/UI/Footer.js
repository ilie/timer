import React from "react";
import GearIcon from "../../Assets/img/gear-icon.svg";
const Footer = (props) => {
  const fullYear = new Date().getFullYear();
  return (
    <footer>
      <div className="footer">
        <a href="https://www.vlec.es" target="_blank">
          <p>Virginia Lyons Exam Centre © {fullYear}</p>
        </a>
        <img
          className="settings-btn"
          src={GearIcon}
          alt="Settings"
          onClick={props.click}
        />
      </div>
    </footer>
  );
};

export default Footer;
