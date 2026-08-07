import React, { useCallback, useMemo, useState, memo, useContext, type ReactNode } from 'react';

import { Button } from '@mantine/core';
import moment from 'moment';

import Modal from '@/components/CbModal';
import { type TournamentState } from '@/slices/initial';

import i18n from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';

const formatValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return i18n.t(value ? 'Yes' : 'No');
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : null;
  }

  return String(value);
};

const formatTranslatedValue = (value: unknown): string | null => {
  const formattedValue = formatValue(value);
  return formattedValue === null ? null : i18n.t(formattedValue);
};

const formatDate = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  return moment.utc(value as moment.MomentInput).format('YYYY-MM-DD HH:mm:ss [UTC]');
};

interface DetailItem {
  label: string;
  value: ReactNode;
}

interface DetailSectionProps {
  title: string;
  items: DetailItem[];
}

function DetailSection({ title, items }: DetailSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="cb-bg-highlight-panel cb-rounded p-3 h-100">
      <div className="small text-uppercase text-muted font-weight-bold mb-3">{title}</div>
      <div className="row mx-n2">
        {items.map(({ label, value }) => (
          <div key={label} className="col-12 col-sm-6 px-2 mb-3">
            <div className="small text-muted mb-1">{label}</div>
            <div className="font-weight-bold text-break">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RawJsonSectionProps {
  tournament: TournamentState;
}

function RawJsonSection({ tournament }: RawJsonSectionProps) {
  const json = useMemo(() => {
    const { matches, ranking, players, ...rest } = tournament;
    return JSON.stringify(rest, null, 2);
  }, [tournament]);

  return (
    <pre
      className="cb-bg-highlight-panel cb-rounded p-3 mb-0 small cb-text"
      style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {json}
    </pre>
  );
}

interface DetailsModalProps {
  tournament: TournamentState;
  modalShowing: boolean;
  setModalShowing: (show: boolean) => void;
}

function DetailsModal({ tournament, modalShowing, setModalShowing }: DetailsModalProps) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);
  const [showRawJson, setShowRawJson] = useState(false);

  const detailSections = useMemo(() => {
    const sections = [
      {
        title: i18n.t('Overview'),
        items: [
          { label: i18n.t('Name'), value: formatValue(tournament.name) },
          { label: i18n.t('State'), value: formatTranslatedValue(tournament.state) },
          { label: i18n.t('Type'), value: formatTranslatedValue(tournament.type) },
          { label: i18n.t('Level'), value: formatTranslatedValue(tournament.level) },
          { label: i18n.t('Access'), value: formatTranslatedValue(tournament.accessType) },
          {
            label: i18n.t('Ranking type'),
            value: formatTranslatedValue(tournament.rankingType),
          },
        ],
      },
      {
        title: i18n.t('Schedule'),
        items: [
          { label: i18n.t('Starts at'), value: formatDate(tournament.startsAt) },
          { label: i18n.t('Created at'), value: formatDate(tournament.insertedAt) },
          { label: i18n.t('Updated at'), value: formatDate(tournament.updatedAt) },
          { label: i18n.t('Rounds limit'), value: formatValue(tournament.roundsLimit) },
          { label: i18n.t('Current round'), value: formatValue(tournament.currentRoundPosition) },
        ],
      },
      {
        title: i18n.t('Timeouts'),
        items: [
          {
            label: i18n.t('Timeout mode'),
            value: formatTranslatedValue(tournament.timeoutMode),
          },
          {
            label: i18n.t('Round timeout'),
            value: formatValue(tournament.roundTimeoutSeconds),
          },
          {
            label: i18n.t('Current round timeout'),
            value: formatValue(tournament.currentRoundTimeoutSeconds),
          },
          {
            label: i18n.t('Tournament timeout'),
            value: formatValue(tournament.tournamentTimeoutSeconds),
          },
          {
            label: i18n.t('Break duration'),
            value: formatValue(tournament.breakDurationSeconds),
          },
        ],
      },
      {
        title: i18n.t('Participants'),
        items: [
          { label: i18n.t('Players'), value: formatValue(tournament.playersCount) },
          { label: i18n.t('Players limit'), value: formatValue(tournament.playersLimit) },
          { label: i18n.t('Bots visible'), value: formatValue(tournament.showBots) },
          { label: i18n.t('Chat enabled'), value: formatValue(tournament.useChat) },
          { label: i18n.t('Clan mode'), value: formatValue(tournament.useClan) },
          { label: i18n.t('Live'), value: formatValue(tournament.isLive) },
        ],
      },
      {
        title: i18n.t('Task'),
        items: [
          {
            label: i18n.t('Task provider'),
            value: formatTranslatedValue(tournament.taskProvider),
          },
          { label: i18n.t('Task pack'), value: formatValue(tournament.taskPackName) },
          {
            label: i18n.t('Task strategy'),
            value: formatTranslatedValue(tournament.taskStrategy),
          },
          { label: i18n.t('Event ID'), value: formatValue(tournament.eventId) },
          { label: i18n.t('Tournament ID'), value: formatValue(tournament.id) },
        ],
      },
    ];

    return sections.map(({ title, items }) => ({
      title,
      items: items.filter(({ value }) => value !== null),
    }));
  }, [tournament]);

  const handleCancel = useCallback(() => setModalShowing(false), [setModalShowing]);

  return (
    <Modal contentClassName="cb-bg-panel cb-text" show={modalShowing} onHide={handleCancel}>
      <Modal.Header className="cb-border-color" closeButton>
        <Modal.Title>{i18n.t('Tournament details')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {tournament.description ? (
          <div className="cb-bg-highlight-panel cb-rounded p-3 mb-3">
            <div className="small text-uppercase text-muted font-weight-bold mb-2">
              {i18n.t('Description')}
            </div>
            <div className="mb-0 text-break">{tournament.description as ReactNode}</div>
          </div>
        ) : null}
        <div className="row mx-n2">
          {detailSections.map(({ title, items }) => (
            <div key={title} className="col-12 col-lg-6 px-2 mb-3">
              <DetailSection title={title} items={items} />
            </div>
          ))}
        </div>
        {showRawJson && <RawJsonSection tournament={tournament} />}
      </Modal.Body>
      <Modal.Footer className="cb-border-color d-flex justify-content-between">
        <Button
          variant="outline"
          color="cbSecondary"
          size="xs"
          radius="md"
          onClick={() => setShowRawJson((v) => !v)}
        >
          {i18n.t(showRawJson ? 'Hide JSON' : 'Raw JSON')}
        </Button>
        <Button
          onClick={handleCancel}
          color="cbSecondary"
          radius="md"
          className={hasCustomEventStyles ? 'cb-custom-event-btn-secondary' : undefined}
        >
          {i18n.t('Close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default memo(DetailsModal);
