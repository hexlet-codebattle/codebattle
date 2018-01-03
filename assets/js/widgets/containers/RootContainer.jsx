import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import GameWidget from './GameWidget';
import InfoWidget from './InfoWidget';
import Gon from 'Gon';
import { UserActions } from '../redux/Actions';
import * as GameActions from '../middlewares/Game';

class RootContainer extends React.Component {
  componentDidMount() {
    const userId = Gon.getAsset('user_id');
    const { setCurrentUser, editorReady } = this.props;

    setCurrentUser(userId);
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
    dispatch(UserActions.setCurrentUser(...args));
  },
  editorReady: () => {
    dispatch(GameActions.editorReady());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(RootContainer);
