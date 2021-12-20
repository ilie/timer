const Checkbox = (props) => {
  const submitHandler = (event) => {
    event.preventDefault();
  };
  return (
    <form onSubmit={submitHandler}>
      <label htmlFor={props.name}>{props.label}</label>
      <input
        type="checkbox"
        name="checked"
        checked={props.checked}
        id="checkbox"
        onClick={props.onCheck}
      />
    </form>
  );
};
export default Checkbox;
