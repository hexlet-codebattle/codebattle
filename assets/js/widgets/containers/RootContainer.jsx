import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import Gon from 'Gon';
import userTypes from '../config/userTypes';
import * as actions from '../actions';
import * as GameActions from '../middlewares/Game';

class RootContainer extends React.Component {
  componentDidMount() {
    const user = Gon.getAsset('current_user');
    const { setCurrentUser, editorReady } = this.props;

    setCurrentUser({ ...user, type: userTypes.spectator });
    editorReady();
  }

  render() {
    return !this.props.storeLoaded ? null : (
      <Fragment>
        <GameWidget />
        <InfoWidget />
      </Fragment>
    );
  }
}

RootContainer.propTypes = {
  storeLoaded: PropTypes.bool.isRequired,
  setCurrentUser: PropTypes.func.isRequired,
  editorReady: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({
  storeLoaded: state.storeLoaded,
});

const mapDispatchToProps = dispatch => ({
  setCurrentUser: (...args) => {
    dispatch(actions.setCurrentUser(...args));
  },
  editorReady: () => {
    dispatch(GameActions.editorReady());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
