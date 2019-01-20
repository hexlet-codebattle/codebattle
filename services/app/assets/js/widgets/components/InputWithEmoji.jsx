import React, { PureComponent } from 'react';
import ContentEditable from 'react-contenteditable';
import Emoji from './Emoji';

class InputWithEmoji extends PureComponent {
  state = { sel: null, range: null };

  inputRef = React.createRef();

  setSelAndRange = () => {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    this.setState({ sel, range });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const { handleSubmit } = this.props;
      e.preventDefault();
      handleSubmit();
    }
  };

  insertEmoji = (emoji) => {
    const { sel, range } = this.state;
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
    sel.removeAllRanges();
    sel.addRange(range);
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
    const { value } = this.props;
    return (
      <>
        <ContentEditable
          className="form-control"
          html={value}
          onChange={this.onChange}
          innerRef={this.inputRef}
          onKeyPress={this.handleKeyPress}
        />
        <Emoji
          addEmoji={this.addEmoji}
          setSelAndRange={this.setSelAndRange}
          fallback={(emoji, props) => (emoji ? `:${emoji.short_names[0]}:` : props.emoji)}
        />
      </>
    );
  }
}

export default InputWithEmoji;
