import React from 'react';

const Card = ({ title, children }) => (
  <div className="container-xl bg-white shadow-sm py-4 mb-3">
    <h3 className="text-center mb-4">{title}</h3>
    {children}
  </div>
);

export default Card;
