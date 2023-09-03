import React from 'react';

import ReactMarkdown from 'react-markdown';

const TaskDescriptionMarkdown = ({ description }) => (
  <ReactMarkdown
    source={description}
    renderers={{
      linkReference: reference => {
        if (!reference.href) {
          return (
            <>
              [
              {reference.children}
              ]
            </>
);
        }
        return <a href={reference.$ref}>{reference.children}</a>;
      },
    }}
  />
);

export default TaskDescriptionMarkdown;
