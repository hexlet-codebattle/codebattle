import 'katex/dist/katex.min.css';

import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import classes from './Markdown.module.css';

/** Task descriptions: markdown with $inline$ / $$block$$ math (KaTeX), like the legacy page. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className={classes.markdown}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
