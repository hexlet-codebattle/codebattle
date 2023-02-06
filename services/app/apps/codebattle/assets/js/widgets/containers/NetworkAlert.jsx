import React, { useContext } from 'react';
import { networkMachineStates } from '../machines/game';
import GameContext from './GameContext';

const NetworkAlert = () => {
    const { current: gameCurrent } = useContext(GameContext);

    if (gameCurrent.matches({ network: networkMachineStates.disconnectedWithMessage })) {
        return <div className="col-12 bg-warning text-center">Server is temporarily unavailable ¯\_(ツ)_/¯ :prod_is_down:</div>;
    }

    return (<></>);
};

export default NetworkAlert;
