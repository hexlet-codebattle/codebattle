import { Center, Loader } from '@mantine/core';
import { type ComponentProps, lazy, Suspense } from 'react';

import type { CodeEditor as CodeEditorImpl } from './CodeEditor';
import classes from './CodeEditor.module.css';

// Monaco is several megabytes: loading it on demand lets the page (top bar, task, chat)
// paint while the editor downloads, instead of the whole page waiting for it.
const LazyEditor = lazy(() => import('./CodeEditor').then((module) => ({ default: module.CodeEditor })));

export function CodeEditor(props: ComponentProps<typeof CodeEditorImpl>) {
  return (
    <Suspense
      fallback={
        <Center className={classes.root}>
          <Loader size="sm" />
        </Center>
      }
    >
      <LazyEditor {...props} />
    </Suspense>
  );
}
