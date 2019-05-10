var roles = require('enquirer/lib/roles')
var utils = require('enquirer/lib/utils')
var colors = require('ansi-colors')

function promptProcess(prompt: any) {
  prompt.toChoice = async function(ele, i, parent) {
    if (typeof ele === 'function') ele = await ele.call(this, this);
    if (ele instanceof Promise) ele = await ele;
    if (typeof ele === 'string') ele = { name: ele };

    if (ele.normalized) return ele;
    ele.normalized = true;

    let origVal = ele.value;
    let role = roles(ele.role, this.options);
    ele = role(this, ele);

    if (typeof ele.disabled === 'string' && !ele.hint) {
      ele.hint = ele.disabled;
      ele.disabled = true;
    }

    if (ele.disabled === true && ele.hint == null) {
      // ele.hint = '(disabled)';
    }

    // if the choice was already normalized, return it
    if (ele.index != null) return ele;
    ele.name = ele.name || ele.key || ele.title || ele.value || ele.message;
    ele.message = ele.message || ele.name || '';
    ele.value = [ele.value, ele.name].find(this.isValue.bind(this));

    ele.input = '';
    ele.index = i;
    ele.cursor = 0;

    utils.define(ele, 'parent', parent);
    ele.level = parent ? parent.level + 1 : 1;
    if (ele.indent == null) {
      ele.indent = parent ? parent.indent + '  ' : (ele.indent || '');
    }

    ele.path = parent ? parent.path + '.' + ele.name : ele.name;
    ele.enabled = !!(this.multiple && !this.isDisabled(ele) && (ele.enabled || this.isSelected(ele)));

    if (!this.isDisabled(ele)) {
      this.longest = Math.max(this.longest, colors.unstyle(ele.message).length);
    }

    // shallow clone the choice first
    let choice = { ...ele };

    // then allow the choice to be reset using the "original" values
    ele.reset = (input = choice.input, value = choice.value) => {
      for (let key of Object.keys(choice)) ele[key] = choice[key];
      ele.input = input;
      ele.value = value;
    };

    if (origVal == null && typeof ele.initial === 'function') {
      ele.input = await ele.initial.call(this, this.state, ele, i);
    }

    return ele;
  }

  prompt.render = async function() {
    let { submitted, size } = this.state;
  
    let prompt = '';
    let header = await this.header();
    let prefix = await this.prefix();
    let separator = await this.separator();
    let message = await this.message();
  
    if (this.options.promptLine !== false) {
      prompt = [prefix, message, separator, ''].join(' ');
      this.state.prompt = prompt;
    }
  
    let output = await this.format();
    let help = (await this.error()) || (await this.hint());
    let body = await this.renderChoices();
    let footer = await this.footer();
  
    if (output) prompt += output;
    if (help && !prompt.includes(help)) prompt += ' ' + help;
  
    if (submitted && !output && !body.trim() && this.multiple && this.emptyError != null) {
      prompt += this.styles.danger(this.emptyError);
    }
  
    this.clear(size);
    this.write([header, body, footer].filter(Boolean).join('\n'));
    this.write(this.margin[2]);
    this.restore();
  }
}

export { promptProcess };

export default promptProcess;
