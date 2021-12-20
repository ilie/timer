import React from "react";
import GearIcon from "../../Assets/img/gear-icon.svg";
import Checkbox from "./Checkbox";

const Footer = (props) => {
  const fullYear = new Date().getFullYear();
  return (
    <footer>
      <div className="footer">
        <a href="https://www.vlec.es" target="_blank">
          <p>Virginia Lyons Exam Centre © {fullYear}</p>
        </a>
        <div className="settings">
          {props.examName !== "" ? (
            <Checkbox
              name="showTimer"
              label="Show Remaining Time "
              checked={props.showTimer}
              onCheck={props.toggleShowTimer}
            />
          ) : null}
          <img
            className="settings-btn"
            src={GearIcon}
            alt="Settings"
            onClick={props.click}
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
