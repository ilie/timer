const Checkbox = (props) => {
  const submitHandler = (event) => {
    event.preventDefault();
  };
  return (
    <form onSubmit={submitHandler}>
      <label htmlFor={props.name}>{props.label}</label>
      <input
        disabled
        type="checkbox"
        name="checked"
        defaultChecked={props.checked}
        id="checkbox"
        onClick={props.onCheck}
      />
    </form>
  );
};
export default Checkbox;
