import React from 'react';
import i18n from 'i18next';
import copy from 'copy-to-clipboard';

class WaitingOpponentInfo extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { copied: false };
  }

  onFocus = e => e.target.select();

  render() {
    const { gameUrl } = this.props;
    const { copied } = this.state;
    const textButtonCopy = copied ? 'Copied' : 'Copy';
    return (
      <div className="jumbotron container text-center bg-white shadow-sm">
        <div className="col-xl-8 col-lg-10 col-12 m-auto">
          <h2 className="h2 font-weight-normal">{i18n.t('Waiting for an opponent')}</h2>
          <p className="lead mb-4">{i18n.t('Please wait for someone to join or send an invite using the link below')}</p>
          <div>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control border-secondary"
                aria-label="Recipient's username"
                aria-describedby="basic-addon2"
                value={gameUrl}
                readOnly
                onFocus={this.onFocus}
              />
              <div className="input-group-append">
                <button
                  className="btn btn-outline-secondary btn-block"
                  type="button"
                  onClick={() => {
                    copy(gameUrl);
                    this.setState({ copied: true });
                  }}
                >
                  {i18n.t(textButtonCopy)}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  data-method="delete"
                  data-csrf={window.csrf_token}
                  data-to={gameUrl}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default WaitingOpponentInfo;
