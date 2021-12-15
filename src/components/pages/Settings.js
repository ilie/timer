import Form from "./form/Form";
const Settings = (props) => {
  return (
    <div className="settings">
      <div className="settings-header">
        <h2 className="setings-title">Please select your options</h2>
      </div>
      <div className="settngs-body">
        <Form {...props} />
      </div>
    </div>
  );
};

export default Settings;
