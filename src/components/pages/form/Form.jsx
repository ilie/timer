import { useState, useEffect, useRef } from "react";
import { getExamParts, examOptions, examPartOptions } from "./Helpers";

const Form = (props) => {
  const [selectedExam, setSelectedExam] = useState();
  const [selectExamTouched, setSelectExamTouched] = useState(false);
  const [availableExamParts, setAvailableExamParts] = useState([]);
  const [selectedExamPart, setSelectedExamPart] = useState();
  const [selectedExamPartDetails, setSelectedExamPartDetails] = useState();
  const [selectExamPartTouched, setSelectExamPartTouched] = useState(false);

  const disabled = !!selectExamPartTouched && !!selectExamPartTouched;
  const examTypeRef = useRef("");

  useEffect(() => {
    if (selectExamTouched) {
      setAvailableExamParts(getExamParts(selectedExam));
    }
  }, [selectExamTouched, selectedExam]);

  const onChangeExamHandler = (event) => {
    setSelectedExam(event.target.value);
    setSelectExamTouched(true);
  };

  const onChangeExamPartHandler = (event) => {
    setSelectedExamPart(event.target.value);
    setSelectExamPartTouched(true);
    const examPart = availableExamParts.find((part) => {
      return part.name === event.target.value;
    });
    setSelectedExamPartDetails(examPart);
  };

  const onSubmitHandler = (event) => {
    let showTimer = false;
    if (
      examTypeRef.current.value === "PB" &&
      selectedExamPart !== "Listening"
    ) {
      showTimer = true;
      console.log("is true");
    }
    sessionStorage.setItem("examType", examTypeRef.current.value);
    event.preventDefault();
    props.onExamName(selectedExam);
    props.onExamPart(selectedExamPart);
    props.onExamTime(selectedExamPartDetails.time);
    props.onExamTimeInMinutes(selectedExamPartDetails.minutes);
    props.onShowTimer(showTimer);
    props.onHideModal();
  };

  return (
    <form className="modal-form" onSubmit={onSubmitHandler}>
      <div className="form-control">
        <label htmlFor="examType">Type: </label>
        <select
          name="examType"
          id="examType"
          className="exam-type-option"
          ref={examTypeRef}
        >
          <option value="">--- Select from the dropdown ---</option>
          <option value="CB">CB (Computer Based)</option>
          <option value="PB">PB (Paper Based)</option>
        </select>
      </div>
      <div className="form-control">
        <label htmlFor="examName">Exam: </label>
        <select
          className="exam-name-option"
          name="examName"
          id="examName"
          onChange={onChangeExamHandler}
        >
          <option key="00000" value="">
            --- Select from the dropdown ---
          </option>
          {examOptions}
        </select>
      </div>
      {selectExamTouched && (
        <div className="form-control">
          <label htmlFor="examPart">Exam Part: </label>
          <select
            className="exam-part-option"
            name="examPart"
            id="examPart"
            onChange={onChangeExamPartHandler}
          >
            <option key="01.2349jsd" value="">
              --- Select from the dropdown ---
            </option>
            {examPartOptions(availableExamParts)}
          </select>
        </div>
      )}
      <div className="form-control">
        <button
          className="btn btn-cancel"
          type="cancel"
          onClick={props.onHideModal}
        >
          Cancel
        </button>
        <button className="btn btn-save" type="submit" disabled={!disabled}>
          Save
        </button>
      </div>
    </form>
  );
};

export default Form;
