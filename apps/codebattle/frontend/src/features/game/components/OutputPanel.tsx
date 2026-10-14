import { Alert, Loader, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconAlertTriangleFilled, IconCircleCheckFilled, IconCircleXFilled } from '@tabler/icons-react';
import { forwardRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AssertResult, CheckResult } from '../types';
import classes from '../GameRoom.module.css';

const ERROR_STATUSES = ['error', 'memory_leak', 'timeout', 'service_failure'];

/** Arguments / Expected / Received (+ STDOUT) of one test, as aligned rows. */
export const TestDetail = forwardRef<HTMLDivElement, { assert: AssertResult; index: number; active?: boolean }>(function TestDetail(
  { assert, index, active = false },
  ref,
) {
  const { t } = useTranslation();
  const passed = assert.status === 'success';

  return (
    <div ref={ref} className={classes.testDetail} data-active={active || undefined}>
      <div className={classes.testDetailHead}>
        <Text span size="xs" fw={700}>
          {t('Test %{number}', { number: index + 1 })}
        </Text>
        <Text span size="xs" fw={700} c={passed ? 'green' : 'red'}>
          {passed ? t('passed') : t('failed')}
        </Text>
        {assert.execution_time ? (
          <Text span size="xs" c="dimmed" ff="monospace" ml="auto">
            {assert.execution_time}
          </Text>
        ) : null}
      </div>
      <dl className={classes.testValues}>
        <dt>{t('Arguments')}</dt>
        <dd>{assert.arguments ?? '—'}</dd>
        <dt>{t('Expected')}</dt>
        <dd>{assert.expected ?? '—'}</dd>
        <dt>{t('Received')}</dt>
        <dd data-wrong={!passed || undefined} data-right={passed || undefined}>
          {assert.result ?? '—'}
        </dd>
        {assert.output ? (
          <>
            <dt>{t('STDOUT')}</dt>
            <dd>
              <pre>{assert.output}</pre>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
});

/** One square per test; picks which test the detail shows. */
function TestStrip({ asserts, selected, onSelect }: { asserts: AssertResult[]; selected: number | null; onSelect?: (index: number) => void }) {
  const { t } = useTranslation();

  return (
    <div className={classes.testStrip} role="tablist" aria-label={t('Tests')}>
      {asserts.map((assert, index) => (
        <Tooltip key={index} label={`${t('Test %{number}', { number: index + 1 })}: ${assert.status === 'success' ? t('passed') : t('failed')}`} openDelay={250}>
          <UnstyledButton
            role="tab"
            aria-selected={index === selected}
            className={classes.testCell}
            data-passed={assert.status === 'success' || undefined}
            data-active={index === selected || undefined}
            onClick={onSelect ? () => onSelect(index) : undefined}
            data-static={!onSelect || undefined}
          >
            {index + 1}
          </UnstyledButton>
        </Tooltip>
      ))}
    </div>
  );
}

type Tone = 'ok' | 'fail' | 'error' | 'muted';

function Head({ tone, title, score }: { tone: Tone; title: string; score?: string }) {
  const icon =
    tone === 'ok' ? (
      <IconCircleCheckFilled size={16} />
    ) : tone === 'error' ? (
      <IconAlertTriangleFilled size={16} />
    ) : tone === 'fail' ? (
      <IconCircleXFilled size={16} />
    ) : (
      <Loader size={14} />
    );

  return (
    <div className={classes.outHead} data-tone={tone}>
      {icon}
      <Text span size="sm" fw={700}>
        {title}
      </Text>
      {score && <span className={classes.outScore}>{score}</span>}
    </div>
  );
}

/** One player's last check: a status line, a strip of tests, and the chosen test's values. */
interface OutputPanelProps {
  output: CheckResult | undefined;
  checking: boolean;
  /** Verdict and pass/fail squares only (the opponent's tests): no values, nothing to pick. */
  summaryOnly?: boolean;
  /** Under the verdict and squares (the opponent's summary in the Tests tab). */
  leftExtra?: ReactNode;
}

export function OutputPanel({ output, checking, summaryOnly = false, leftExtra = null }: OutputPanelProps) {
  const { t } = useTranslation();
  // Layouts without the split still show the extra block under them.
  const withExtra = (node: ReactNode) =>
    leftExtra ? (
      <div className={classes.out}>
        {node}
        {leftExtra}
      </div>
    ) : (
      node
    );
  const asserts = output?.asserts ?? [];
  const firstFailed = asserts.findIndex((assert) => assert.status !== 'success');
  const [selected, setSelected] = useState(Math.max(firstFailed, 0));

  // A new run: jump to its first failing test.
  useEffect(() => setSelected(Math.max(firstFailed, 0)), [output, firstFailed]);

  if (checking) return withExtra(<Head tone="muted" title={summaryOnly ? t('Checking…') : t('Checking your solution…')} />);
  if (!output) return withExtra(null);

  if (output.status === 'game_is_dead') return withExtra(<Alert color="gray">{t('Time for checking after the game is over')}</Alert>);

  if (['client_timeout', 'service_timeout'].includes(output.status)) {
    return withExtra(
      <Alert color="yellow" title={t('We could not verify your solution')}>
        {t('Please try to fix your code and submit it again')}. {t('Note that your code may contain an infinite loop or complex calculations')}
      </Alert>,
    );
  }

  const postTimeout = output.post_timeout ? (
    <Text size="xs" c="yellow" fw={600}>
      {t('Checked after the time ran out: the result does not count')}
    </Text>
  ) : null;

  if (ERROR_STATUSES.includes(output.status)) {
    return (
      <div className={classes.out}>
        <Head tone="error" title={output.status === 'timeout' ? t('Time limit exceeded') : output.status === 'memory_leak' ? t('Memory limit exceeded') : t('Error')} />
        {postTimeout}
        {!summaryOnly && output.output_error ? <pre className={classes.outputError}>{output.output_error}</pre> : null}
        {leftExtra}
      </div>
    );
  }

  const total = output.asserts_count ?? asserts.length;
  const passed = output.success_count ?? asserts.filter((assert) => assert.status === 'success').length;
  const allPassed = output.status === 'ok';

  const head = (
    <Head
      tone={allPassed ? 'ok' : 'fail'}
      title={allPassed ? t('All tests passed') : t('%{failed} of %{total} tests failed', { failed: total - passed, total })}
      score={`${passed}/${total}`}
    />
  );

  if (summaryOnly) {
    return (
      <div className={classes.out}>
        {head}
        {asserts.length > 0 && <TestStrip asserts={asserts} selected={null} />}
      </div>
    );
  }

  // Wide: verdict and squares on the left (pinned), every failed test listed on the right.
  return (
    <div className={classes.outSplit}>
      <div className={`${classes.out} ${classes.outPinned}`}>
        {head}
        {postTimeout}
        {asserts.length > 0 && <TestStrip asserts={asserts} selected={selected} onSelect={setSelected} />}
        {output.output_error ? <pre className={classes.outputError}>{output.output_error}</pre> : null}
        {leftExtra}
      </div>
      <TestList asserts={asserts} selected={selected} />
    </div>
  );
}

/** Every failed test (plus a passed one when picked), the picked one scrolled into view. */
function TestList({ asserts, selected }: { asserts: AssertResult[]; selected: number }) {
  const cards = useRef(new Map<number, HTMLDivElement>());
  const shown = asserts.flatMap((assert, index) => (assert.status !== 'success' || index === selected ? [index] : []));

  useEffect(() => {
    cards.current.get(selected)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  return (
    <div className={classes.testList}>
      {shown.map((index) => (
        <TestDetail
          key={index}
          ref={(node) => {
            if (node) cards.current.set(index, node);
            else cards.current.delete(index);
          }}
          assert={asserts[index]}
          index={index}
          active={index === selected}
        />
      ))}
    </div>
  );
}
