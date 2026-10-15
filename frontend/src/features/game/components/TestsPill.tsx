import { Loader, Popover, Tooltip, UnstyledButton } from '@mantine/core';
import { IconAlertTriangleFilled, IconCircleCheckFilled, IconCircleXFilled, IconFlask } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { useGameStore } from '../store';
import classes from '../GameRoom.module.css';

import { OutputPanel } from './OutputPanel';

const ERROR_STATUSES = ['error', 'memory_leak', 'timeout', 'service_failure'];

/**
 * A player's last check in their editor header: "✔ 5/8" with a thin bar. Mine jumps to the
 * Tests tab; the opponent's opens a popover with their verdict and pass/fail squares only.
 */
export function TestsPill({ playerId, onOpen }: { playerId: number; onOpen?: () => void }) {
  const { t } = useTranslation();
  const output = useGameStore((state) => state.outputs[playerId]);
  const checking = useGameStore((state) => Boolean(state.checking[playerId]));

  const ran = output && !['initial', 'started'].includes(output.status);
  const isError = ran && ERROR_STATUSES.includes(output.status);
  const total = output?.asserts_count ?? 0;
  const passed = output?.success_count ?? 0;
  const tone = checking ? 'muted' : !ran ? 'none' : output.status === 'ok' ? 'ok' : 'fail';
  const percent = total > 0 ? Math.round((passed / total) * 100) : 0;

  const pill = (
    <UnstyledButton className={classes.testsPill} data-tone={tone} onClick={onOpen} aria-label={t('Tests')}>
      {checking ? (
        <Loader size={11} />
      ) : !ran ? (
        <IconFlask size={13} />
      ) : isError ? (
        <IconAlertTriangleFilled size={13} />
      ) : output.status === 'ok' ? (
        <IconCircleCheckFilled size={13} />
      ) : (
        <IconCircleXFilled size={13} />
      )}
      <span className={classes.testsPillText}>{checking ? t('Checking…') : !ran ? t('No runs yet') : isError ? t('Error') : `${passed}/${total}`}</span>
      {ran && !isError && !checking && (
        <span className={classes.testsPillBar}>
          <span style={{ width: `${percent}%` }} />
        </span>
      )}
    </UnstyledButton>
  );

  if (onOpen) return <Tooltip label={t('Show test results')}>{pill}</Tooltip>;
  if (!ran && !checking) return pill;

  return (
    <Popover position="bottom-end" width={340} shadow="md" withArrow>
      <Popover.Target>{pill}</Popover.Target>
      <Popover.Dropdown>
        <OutputPanel output={output} checking={checking} summaryOnly />
      </Popover.Dropdown>
    </Popover>
  );
}
