// Shared styling for tournament ranking table cells. Ports the legacy Bootstrap
// `p-1 pl-4 my-2 align-middle text-nowrap border-0` utility set that both
// ranking panels (PlayersRankingPanel, ReportsPanel) applied to their <Table.Td>.
export const rankingCellStyle = {
  padding: '0.25rem',
  paddingLeft: '1.5rem',
  marginTop: '0.5rem',
  marginBottom: '0.5rem',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  border: '0',
} as const;

export const rankingCellClassName = 'pos-relative cb-custom-event-td';
