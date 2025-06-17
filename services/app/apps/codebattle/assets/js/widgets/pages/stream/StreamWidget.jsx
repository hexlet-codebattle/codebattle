import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import { connectToStream} from '../../middlewares/Stream';

function StreamWidget() {
  const dispatch = useDispatch();
  const gameId = useSelector(state => state.game.id);
  
  console.log(gameId)
  useEffect(() => {
    dispatch(connectToStream());
  }, []);
  
  return <div>Stream Widget</div>;
}   

export default StreamWidget;

