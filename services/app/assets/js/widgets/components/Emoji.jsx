import React from 'react';
import 'emoji-mart/css/emoji-mart.css';
import { Picker } from 'emoji-mart';
import customEmoji from '../lib/customEmoji';

const styles = {
  pickerEmoji: {
    position: 'absolute',
    bottom: '30px',
    right: '16px',
    maxHeight: '200px',
    overflow: 'hidden',
  },
  emoji: {
    position: 'relative',
    left: '3px',
    top: '1px',
  },
};

class Emoji extends React.Component {
  state = { showEmoji: false };

  toggleEmoji = () => {
    const { showEmoji } = this.state;
    if (showEmoji) {
      this.closeEmoji();
    } else {
      this.openEmoji();
    }
  }

  onSelect = (emoji) => {
    const { addEmoji } = this.props;
    addEmoji(emoji, this.closeEmoji);
  }

  openEmoji = () => {
    this.props.setSelAndRange();
    this.setState({
      showEmoji: true,
    }, () => document.addEventListener('click', this.closeEmojiOutsideClick, false));
  }

  closeEmoji = () => {
    this.setState({
      showEmoji: false,
    }, () => document.removeEventListener('click', this.closeEmojiOutsideClick, false));
  }

  closeEmojiOutsideClick = (e) => {
    const { target } = e;
    const isPickerEmoji = target.closest('.emoji-mart');
    if (!isPickerEmoji) {
      this.closeEmoji();
    }
  }

  render() {
    const { showEmoji } = this.state;
    return (
      <React.Fragment>
        <div className="input-group-append d-none d-sm-block">
          <div
            role="button"
            tabIndex="-1"
            className="btn btn-link border"
            onClick={this.toggleEmoji}
            onKeyPress={this.toggleEmoji}
          >
            <span role="img" aria-label="Emoji" style={styles.emoji}>😀</span>
          </div>
        </div>
        {showEmoji && (
          <Picker
            title="Pick your emoji…"
            emoji="point_up"
            onSelect={this.onSelect}
            style={styles.pickerEmoji}
            custom={customEmoji}
          />
        )}
      </React.Fragment>
    );
  }
}

export default Emoji;
