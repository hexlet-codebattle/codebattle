import React, { useContext } from 'react';
import { networkMachineStates } from '../machines/game';
import GameContext from './GameContext';

const NetworkAlert = () => {
    const { current: gameCurrent } = useContext(GameContext);

    if (gameCurrent.matches({ network: networkMachineStates.disconnected })) {
        return <div className="col-12 bg-warning text-center">Check your network connection</div>;
    }

    return (<></>);
};

export default NetworkAlert;
