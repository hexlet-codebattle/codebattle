import React from 'react';

import { type AnyActorRef } from 'xstate';

export interface RoomContextValue {
  mainService: AnyActorRef;
  taskService: AnyActorRef;
}

const context = React.createContext<RoomContextValue>({} as RoomContextValue);

export default context;
