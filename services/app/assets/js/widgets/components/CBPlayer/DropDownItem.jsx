
import React from 'react';

const DropDownItem = ({
  icon, text, id, onClick, speedMode,
}) => (
  <div className="dropdown-item bg-light">
    <div className="row flex-nowrap">
      <div className="col-1">
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="col">{text}</div>
      <div className="col-auto">
        <div className="custom-control custom-switch ">
          <input type="checkbox" checkded={speedMode} onClick={onClick} className="custom-control-input" id={`customSwitch${id}`} />
{/* eslint-disable-line */} <label className="custom-control-label" htmlFor={`customSwitch${id}`} />
        </div>
      </div>
    </div>
  </div>
);

export default DropDownItem;
