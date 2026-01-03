import React from 'react';

import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';
import '../../../../css/_katex-fonts.scss';

function TaskDescriptionMarkdown({ description }) {
  return (
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {description}
    </Markdown>
  );
}

export default TaskDescriptionMarkdown;
