import React from 'react';

import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

const TaskDescriptionMarkdown = ({ description }) => (
  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
    {description}
  </Markdown>
);

export default TaskDescriptionMarkdown;
