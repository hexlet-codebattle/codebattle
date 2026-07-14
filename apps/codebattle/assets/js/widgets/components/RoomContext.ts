import React from 'react';

import { type AnyInterpreter } from 'xstate';

export interface RoomContextValue {
  mainService: AnyInterpreter;
  taskService: AnyInterpreter;
}

const context = React.createContext<RoomContextValue>({} as RoomContextValue);

export default context;
