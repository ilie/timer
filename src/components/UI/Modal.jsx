import { Fragment } from "react";
import classes from "./Modal.module.css";
import Backdrop from "./Backdrop";

const Modal = (props) => {
  return (
    <Fragment>
      <Backdrop show={props.showModal} click={props.click} />
      <div
        className={classes.Modal}
        style={{
          transform: props.showModal ? "translateY(0)" : "translateY(-100vh)",
          opacity: props.showModal ? 1 : 0,
        }}
      >
        {props.children}
      </div>
    </Fragment>
  );
};

export default Modal;
