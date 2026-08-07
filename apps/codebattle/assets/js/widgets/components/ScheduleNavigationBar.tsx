import React, { useState, useEffect, useCallback } from 'react';

import { Flex, Group, UnstyledButton } from '@mantine/core';

import dayjs from '../../i18n/dayjs';
import { localizeTournamentName } from '../utils/localizeTournamentName';

interface ScheduleEvent {
  title?: string;
  start?: string | number | Date;
  resourse: { id: number | string; grade?: string };
}

interface ScheduleNavigationTabProps {
  className?: string;
  events: ScheduleEvent[];
  event?: ScheduleEvent;
  setEvent: (event?: ScheduleEvent) => void;
}

function ScheduleNavigationTab({ className, events, event, setEvent }: ScheduleNavigationTabProps) {
  const [prev, setPrevEvent] = useState<ScheduleEvent | undefined>();
  const [next, setNextEvent] = useState<ScheduleEvent | undefined>();

  useEffect(() => {
    if (event) {
      const sortedEvents = events.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
      const eventIndex = sortedEvents.findIndex((e) => e.resourse.id === event.resourse.id);

      if (eventIndex === -1) return;

      if (eventIndex < 1) {
        setPrevEvent(undefined);
      } else {
        setPrevEvent(sortedEvents[eventIndex - 1]);
      }

      if (eventIndex > events.length - 2) {
        setNextEvent(undefined);
      } else {
        setNextEvent(sortedEvents[eventIndex + 1]);
      }
    }
  }, [event, events, setPrevEvent, setNextEvent]);

  const onClickPrev = useCallback(() => {
    setEvent(prev);
  }, [setEvent, prev]);
  const onClickNext = useCallback(() => {
    setEvent(next);
  }, [setEvent, next]);

  const getEventTitle = (item: ScheduleEvent) => {
    return localizeTournamentName(item.title, item.resourse.grade);
  };

  return (
    <div className={className}>
      <Flex>
        {prev && (
          <UnstyledButton c="white" onClick={onClickPrev}>
            <Group gap="sm" wrap="nowrap">
              <span>{'<<'}</span>
              <span>{getEventTitle(prev)}</span>
            </Group>
          </UnstyledButton>
        )}
      </Flex>
      <Flex>
        {next && (
          <UnstyledButton c="white" onClick={onClickNext}>
            <Group gap="sm" wrap="nowrap">
              <span>{getEventTitle(next)}</span>
              <span>{'>>'}</span>
            </Group>
          </UnstyledButton>
        )}
      </Flex>
    </div>
  );
}

export default ScheduleNavigationTab;
