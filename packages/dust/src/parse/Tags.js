
// const ParseUtils = require('./ParseUtils');

const _if = (parser, block) => {
  parser.pushBlock(block);
  parser.stackBlock(block);
};

const _loop = (parser, block) => {
  parser.pushBlock(block);
  if (!block.selfClosedTag) {
    parser.stackBlock(block);
  }
};

const _not = (parser, block) => {
  parser.pushBlock(block);
  parser.stackBlock(block);
};

const _helper = (parser, block) => {
  parser.pushBlock(block);
  if (!block.selfClosedTag) {
    parser.stackBlock(block);
  }
};

const ALLOWED_BODIES = [ 'else' ];
const _body = (parser, block) => {
  if (ALLOWED_BODIES.indexOf(block.tag) === -1) {
    throw new Error(`Unexpected tag {${block.type}${block.tag}..`)
  }
  parser.addBody(block.tag);
};

const _end = (parser, block) => {
  const opening = parser.pop();
  if (opening && opening.type !== '>' && opening.tag !== block.tag)  {
    console.error(`Open/close tag mismatch! '${opening.tag}' <> '${block.tag}'`);
  }
};

const _content = (parser, block) => {
  parser.pushBlock(block);
  parser.stackBlock(block);
};

const _include = (parser, block) => {
  block.file = block.params.$;
  parser.pushBlock(block);
  if (!block.selfClosedTag) {
    parser.stackBlock(block);
  }
};

const _insert = (parser, block) => {
  parser.pushBlock(block);
  if (!block.selfClosedTag) {
    parser.stackBlock(block);
  }
};

const SPECIALS = {
	s		: ' ',
	n		: '\\n',
	r		: '\\r\\n',
	lb	: '{',
	rb	: '}',
};

const _special = (parser, block) => {
	if (SPECIALS[block.tag]){
		parser.pushBlock(SPECIALS[block.tag]);
	}
};

const TAGS = {
  '?': _if,
  '#': _loop,
  '^': _not,
  '@': _helper,
  ':': _body,
  '/': _end,
  '>': _include,
  '<': _content,
  '+': _insert,
	'~': _special,
};

module.exports = TAGS;
