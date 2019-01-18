import React, { PureComponent } from 'react';
import { scrolled } from 'react-stay-scrolled';
import Emoji from './Emoji';

class InputWithEmoji extends PureComponent {
  inputRef = React.createRef();

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.props.handleSubmit();
    }
  };

  addEmoji = (emoji, closeEmoji) => {
    const { value, handleChange } = this.props;
    const input = this.inputRef.current;
    const cursorPosition = input.selectionStart;
    const start = value.substring(0, input.selectionStart);
    const end = value.substring(input.selectionEnd);
    // TODO: fix native emojies and add custom :troll_fase
    const updatedValue = `${start}${emoji.native}${end}`;

    handleChange(updatedValue);
    closeEmoji();
    input.selectionEnd = cursorPosition + emoji.native.length;
    input.focus();
  }

  render() {
    const { value, handleChange } = this.props;
    return (
      <>
        <input
          className="form-control"
          type="text"
          placeholder="Type message here..."
          value={value}
          onChange={handleChange}
          onKeyPress={this.handleKeyPress}
          ref={this.inputRef}
        />
        <Emoji
          addEmoji={this.addEmoji}
          fallback={(emoji, props) => (emoji ? `:${emoji.short_names[0]}:` : props.emoji)}
        />
      </>
    );
  }
}

export default InputWithEmoji;
