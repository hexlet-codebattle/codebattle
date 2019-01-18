import React, { PureComponent } from 'react';
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
    const updatedValue = `${start}${emoji.native}${end}`;

    handleChange(updatedValue);
    closeEmoji();
    input.selectionEnd = cursorPosition + emoji.native.length;
    input.focus();
  }

  onChange = (e) => {
    this.props.handleChange(e.target.value);
  }

  render() {
    const { value } = this.props;
    return (
      <>
        <input
          className="form-control"
          type="text"
          placeholder="Type message here..."
          value={value}
          onChange={this.onChange}
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
