import React from 'react';
import { Table } from 'react-bootstrap';

const Announcement = () => (
  <Table striped borderless className="border border-dark m-0">
    <thead>
      <tr className="bg-gray">
        <th scope="col" className="text-uppercase p-1" colSpan="2">
          <div className="d-flex align-items-center flex-nowrap">
            <span className="d-flex m-2">Announcement</span>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="pr-0">Monthly Arena 2021.07.13 15:30(UTC)</td>
        <td className="text-right pl-0" />
      </tr>
      <tr>
        <td className="pr-0">Monthly Team Skirmish 2021.07.13 15:50(UTC)</td>
        <td className="text-right pl-0" />
      </tr>
    </tbody>
  </Table>
  );

export default Announcement;
