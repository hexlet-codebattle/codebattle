import React from 'react';

import { Head } from '@inertiajs/react';

import { TournamentsSchedulePage } from '../../widgets/App';

interface TournamentsScheduleProps {
  page_title: string;
}

export default function TournamentsSchedule({ page_title }: TournamentsScheduleProps) {
  return (
    <div className="container-lg cb-text">
      <Head title={page_title} />
      <TournamentsSchedulePage />
    </div>
  );
}
