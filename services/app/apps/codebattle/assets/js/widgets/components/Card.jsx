import React from 'react';

function Card({ children, title }) {
  return (
    <div className="container-xl bg-white shadow-sm rounded py-4 mb-3">
      <h3 className="text-center mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default Card;
