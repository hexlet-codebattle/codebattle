import { Loader, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useLatest } from '@/shared/useLatest';

import type { Run } from './types';
import classes from './GroupTournament.module.css';

interface RunIframeProps {
  run: Run;
  userId: number;
  onPlace: (runId: number, place: number | null) => void;
  fill?: boolean;
}

/**
 * The runner's viewer HTML in a script-only sandbox. It's told who I am
 * (`set_current_user_id`) and answers with my place (`set_current_user_id_result`).
 */
function RunIframe({ run, userId, onPlace, fill = false }: RunIframeProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const onPlaceRef = useLatest(onPlace);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return undefined;
    const announce = () => iframe.contentWindow?.postMessage({ type: 'set_current_user_id', currentUserId: userId }, '*');
    iframe.addEventListener('load', announce);
    announce();
    return () => iframe.removeEventListener('load', announce);
  }, [userId]);

  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      const message = event.data as { type?: string; place?: number | null; runId?: number } | null;
      if (message?.type === 'set_current_user_id_result' && typeof message.runId === 'number') {
        onPlaceRef.current(message.runId, message.place ?? null);
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [onPlaceRef]);

  return (
    <iframe
      ref={ref}
      title={`run-viewer-${run.id}`}
      srcDoc={run.result?.viewer_html ?? ''}
      sandbox="allow-scripts"
      className={classes.viewerFrame}
      data-fill={fill || undefined}
    />
  );
}

function Placeholder({ title, note, loading }: { title: string; note?: string; loading?: boolean }) {
  return (
    <Stack align="center" justify="center" gap={6} className={classes.viewerPlaceholder}>
      {loading && <Loader size="sm" />}
      <Text fw={600}>{title}</Text>
      {note && (
        <Text size="sm" c="dimmed">
          {note}
        </Text>
      )}
    </Stack>
  );
}

export const hasViewer = (run: Run | null) => Boolean(run?.result?.viewer_html);

interface RunViewerProps {
  run: Run | null;
  userId: number;
  onPlace: (runId: number, place: number | null) => void;
}

/** The selected run's viewer, or why there is none yet. */
export function RunViewer({ run, userId, onPlace }: RunViewerProps) {
  const { t } = useTranslation();

  if (!run) return <Placeholder title={t('Pick a run from the left panel to see its output.')} />;
  if (hasViewer(run)) return <RunIframe key={run.id} run={run} userId={userId} onPlace={onPlace} />;
  if (run.status === 'pending') {
    return <Placeholder loading title={t('Running your solution…')} note={t("We're executing your code in the runner. This may take a few seconds.")} />;
  }
  if (!run.details_loaded) return <Placeholder loading title={t('Loading run result…')} note={t('Fetching the executed run output.')} />;
  return <Placeholder title={t('No viewer HTML for this run.')} />;
}

interface FullscreenViewerProps extends RunViewerProps {
  opened: boolean;
  onClose: () => void;
}

export function FullscreenViewer({ opened, onClose, run, userId, onPlace }: FullscreenViewerProps) {
  const { t } = useTranslation();
  const open = opened && hasViewer(run);

  return (
    <Modal
      opened={open}
      onClose={onClose}
      fullScreen
      title={`${t('Run Viewer')}${run ? ` · #${run.id}` : ''}`}
      classNames={{ content: classes.fullscreenContent, body: classes.fullscreenBody }}
    >
      {open && run && <RunIframe key={run.id} run={run} userId={userId} onPlace={onPlace} fill />}
    </Modal>
  );
}
