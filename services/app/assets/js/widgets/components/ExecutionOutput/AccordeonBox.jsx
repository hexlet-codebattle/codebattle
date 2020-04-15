import React, { useState } from 'react';
import cn from 'classnames';
import _ from 'lodash';

const statusColors = {
  error: 'danger',
  failure: 'warning',
  ok: 'primary',
  nothing: 'info',
  success: 'success',
};

const AccordeonBox = ({ children }) => (
  <div className="accordion" id="accordionExample">
    { children }
  </div>
);
const Menu = ({ count, children, status }) => {
  const [show, setShow] = useState(false);
  const classCollapse = cn('collapse', {
    show,
  });
  const handleClick = () => {
    setShow(!show);
  };
  const uniqIndex = _.uniqueId('heading');
  // const classIcon = show === false ? 'fa fa-arrow-circle-up mr-2' : 'fa fa-arrow-circle-down mr-2';
  return (
    <div className="card">
      <div className="card-header" id={`heading${uniqIndex}`}>
        <h2 className="mb-0 ">
          <button
            className={`btn btn-${statusColors[status]}`}
            type="button"
            onClick={handleClick}
            data-toggle="collapse"
            // data-target="#collapseOne"
            aria-expanded="true"
            aria-controls={`collapse${uniqIndex}`}
          >
            <i className="fa fa-arrow-circle-down mr-2" />
            <span className="">
              <span className="badge badge-secondary mr-2">{count}</span>
              {status}
            </span>
          </button>
        </h2>
      </div>
      <div id={`collapse${uniqIndex}`} className={classCollapse} aria-labelledby={`heading${uniqIndex}`}>
        123
        {children}
      </div>

    </div>
  );
};
const Item = ({ item, index }) => {
  const [show, setShow] = useState(false);
  const classCollapse = cn('collapse', {
    show,
  });
  const handleClick = () => {
    setShow(!show);
  };

  console.log(item.status);
  // const classIcon = show === false ? 'fa fa-arrow-circle-up mr-2' : 'fa fa-arrow-circle-down mr-2';
  return (
    <div className={`card-body border-${statusColors[item.status]} text-${statusColors[item.status]}`}>
      {`result: ${item.result} expected: ${item.expected} arguments:${item.arguments}`}
    </div>

  );
};

AccordeonBox.Item = Item;
AccordeonBox.Menu = Menu;
export default AccordeonBox;
