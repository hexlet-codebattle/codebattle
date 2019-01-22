import React from 'react';
import 'emoji-mart/css/emoji-mart.css';
import { Picker, Emoji } from 'emoji-mart';
import customEmoji from '../lib/customEmoji';
import Modal from './Modal';

const styles = {
  pickerEmoji: {
    position: 'absolute',
    zIndex: 1000,
  },
  emoji: {
    position: 'relative',
  },
};

class EmojiPicker extends React.Component {
  state = {
    isOpen: false,
    positionX: 0,
    positionY: 0,
    width: 0,
    height: 0,
  };

  buttonRef = React.createRef();

  toggleVisibility = () => {
    const { isOpen } = this.state;
    if (isOpen) {
      this.closeEmoji();
    } else {
      this.openEmoji();
    }
  }

  onSelect = (emoji) => {
    console.log(emoji);
    const { addEmoji } = this.props;
    addEmoji(emoji, this.closeEmoji);
  }

  openEmoji = () => {
    const {
      x, y, width, height,
    } = this.buttonRef.current.getBoundingClientRect();
    this.props.setSelectionAndRange();
    this.setState({
      isOpen: true,
      positionX: x,
      positionY: y,
      width,
      height,
    }, () => document.addEventListener('click', this.closeEmojiOutsideClick, false));
  }

  closeEmoji = () => {
    this.setState({
      isOpen: false,
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
    const {
      isOpen, positionX, positionY, width, height,
    } = this.state;
    return (
      <>
        <div
          className="input-group-append d-none d-sm-block"
          role="button"
          tabIndex="-1"
          onClick={this.toggleVisibility}
          onKeyPress={this.toggleVisibility}
          ref={this.buttonRef}
        >
          <span className="input-group-text">
            <Emoji
              emoji="grinning"
              set="apple"
              size={16}
            />
          </span>
        </div>
        {isOpen && (
          <Modal>
            <Picker
              title="Pick your emoji..."
              emoji="point_up"
              onSelect={this.onSelect}
              custom={customEmoji}
              showPreview={false}
              emojiTooltip
              style={{
                ...styles.pickerEmoji,
                top: positionY + height,
                left: Math.max(positionX - 338 + width, 0),
              }}
            />
          </Modal>
        )}
      </>
    );
  }
}

export default EmojiPicker;
