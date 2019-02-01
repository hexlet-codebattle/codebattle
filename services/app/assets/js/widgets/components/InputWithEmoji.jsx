import React, { PureComponent, Fragment } from 'react';
import ContentEditable from 'react-contenteditable';
import EmojiPicker from './EmojiPicker';

class InputWithEmoji extends PureComponent {
  state = { selection: null, range: null, inputVal: '' };

  inputRef = React.createRef();

  setSelectionAndRange = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    this.setState({ selection, range });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const { handleSubmit } = this.props;
      e.preventDefault();
      handleSubmit();
    }
  };

  insertEmoji = (emoji) => {
    const { selection, range } = this.state;
    range.deleteContents();
    let textNode;
    if (emoji.type === 'image') {
      textNode = document.createElement('img');
      textNode.setAttribute('src', emoji.imageUrl);
      textNode.style.cssText = 'max-width: 19px; max-height: 19px';
    }
    if (emoji.type === 'text') {
      textNode = document.createTextNode(emoji.emojiPic);
    }
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  getEmoji = (emoji) => {
    if (emoji.custom) {
      return {
        ...emoji,
        type: 'image',
      };
    }
    const codes = emoji.unified.split('-').map(c => `0x${c}`);
    const emojiPic = String.fromCodePoint(...codes);
    return {
      type: 'text',
      emojiPic,
    };
  }

  addEmoji = (emoji, closeEmoji) => {
    const { handleChange } = this.props;
    const emojiPic = this.getEmoji(emoji);
    this.insertEmoji(emojiPic);
    const updatedValue = this.inputRef.current.innerHTML;
    handleChange(updatedValue);
    closeEmoji();
  }

  onChange = (e) => {
    const { handleChange } = this.props;
    handleChange(e.target.value);
  }

  render() {
    const { inputVal } = this.state;
    return (
      <Fragment>
        <input
          className="form-control"
          type="text"
          placeholder="Type message here..."
          value={inputVal}
          onChange={this.onChange}
          onKeyPress={this.handleKeyPress}
          ref={this.inputRef}
        />
        <EmojiPicker
          addEmoji={this.addEmoji}
          setSelectionAndRange={this.setSelectionAndRange}
          fallback={(emoji, props) => (emoji ? `:${emoji.short_names[0]}:` : props.emoji)}
        />
      </Fragment>
    );
  }
}

export default InputWithEmoji;
