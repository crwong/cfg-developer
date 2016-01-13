/**
 * Model representing the contents of a context-free grammar (CFG).
 *
 * Christopher Wong, Stanford University, 2014
 */


/**
 * A Symbol is a character that can either be a terminal or nonterminal.
 */
function Symbol(ch, isTerminal) {
  this.ch = ch;
  this.isTerminal = isTerminal;
};

/**
 * Two Symbol instance are equal to each other if the characters and internal
 * isTerminal flags are the same.
 */
Symbol.prototype.equals = function(other) {
  return this.ch === other.ch && this.isTerminal === other.isTerminal;
};

/** Static enumeration variables as options to pass into toString(). */
Symbol.PARENTHESES = 0;
Symbol.BOLD = 1;
Symbol.BOLD_UNDERLINE = 2;
Symbol.BOLD_UNDERLINE_LAST = 11;

/**
 * If showNonterminal is true, then a nonterminal Symbol instance will be
 * highlighted according to the options.
 */
Symbol.prototype.toString = function(showNonterminal, options) {
  if (showNonterminal && !this.isTerminal) {
    // Highlight the nonterminal character based on the options.
    var left = '';
    var right = '';
    switch (options) {
      case Symbol.BOLD_UNDERLINE: {
        left += '<u>';
        right = '</u>' + right;
      }
      case Symbol.BOLD: {
        left += '<strong>';
        right = '</strong>' + right;
        break;
      }
      case Symbol.PARENTHESES:
      default: {
        left += '(';
        right = ')' + right;
        break;
      }
    }
    return left + escapeHTML(this.ch) + right;
  } else {
    // Return just the character.
    return escapeHTML(this.ch);
  }
};

/**
 * Escapes str in HTML.
 */
function escapeHTML(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

/**
 * A SymArray instance is a wrapper around an Array of Symbols. In this model,
 * an empty SymArray instance represents epsilon.
 */
function SymArray(symbols) {
  this.symbols = symbols;
};

/**
 * Two SymArray instances are equal if they are of the same length and
 * the corresponding Symbols are equal.
 */
SymArray.prototype.equals = function(other) {
  if (this.symbols.length !== other.symbols.length) {
    return false;
  }
  for (var i = 0; i < this.symbols.length; i++) {
    if (!this.symbols[i].equals(other.symbols[i])) {
      return false;
    }
  }
  return true;
};

/**
 * Handles Symbol.BOLD_UNDERLINE_LAST case by determining the appropriate
 * options to pass into the Symbol toString().
 */
SymArray.prototype.toString = function(showNonterminals, options) {
  if (this.symbols.length === 0) {
    // Return epsilon Unicode character for an empty Array.
    return '\u03B5';
  }
  var str = '';
  var args;
  var underline = false;
  for (var i = this.symbols.length - 1; i >= 0; i--) {
    switch (options) {
      case Symbol.BOLD_UNDERLINE_LAST: {
        // For the first nonterminal we encounter, also include the underline
        // option, and then mark that we have seen a nonterminal.
        if (!this.symbols[i].isTerminal && !underline) {
          args = Symbol.BOLD_UNDERLINE;
          underline = true;
        } else {
          args = Symbol.BOLD;
        }
        break;
      }
      default: {
        // For all other options, pass them on to the Symbol toString().
        args = options;
      }
    }
    // Append the current Symbol to the beginning of the string.
    str = this.symbols[i].toString(showNonterminals, args) + str;
  }
  return str;
};


/**
 * A Production instance encapsulates everything in one row of a CFG.
 * The lhs property is the left hand nonterminal Symbol, while the rhs
 * property is an Array of SymArray instances.
 */
function Production(lhs, rhs) {
  this.lhs = lhs;
  this.rhs = rhs ? rhs : [];
};

/**
 * Utility function which returns true if rhs already contains an
 * equivalent SymArray.
 */
Production.prototype.rhsContains = function(symArray) {
  for (var i = 0; i < this.rhs.length; i++) {
    if (this.rhs[i].equals(symArray)) {
      return true;
    }
  }
  return false;
};

/**
 * Wrapper utility function to add a SymArray to rhs. To prevent duplicate
 * SymArrays from being present in rhs, always use this function.
 */
Production.prototype.addArray = function(symArray) {
  if (!this.rhsContains(symArray)) {
    this.rhs.push(symArray);
  }
};

/**
 * lhs -> rhs[0] | rhs[1] | ...
 */
Production.prototype.toString = function(showNonterminals, options) {
  var str = this.lhs.toString(showNonterminals, options);
  // Use the Unicode character for a right arrow.
  str += ' &#8594; ';
    for (var i = 0; i < this.rhs.length; i++) {
      str += this.rhs[i].toString(showNonterminals, options);
      if (i !== this.rhs.length - 1) {
        str += ' | ';
      }
    }
  return str;
};


/**
 * A Grammar instance encapsulates everything in a CFG. Production instances
 * are stored in the productions property, which is an object whose keys
 * are the characters of the nonterminal symbols and values are the
 * Production instances. To maintain the order in which Productions are
 * displayed, we have the nonterminals array.
 */
function Grammar(startSymbol) {
  this.startSymbol = startSymbol;
  this.productions = {};
  this.nonterminals = [];
};

/**
 * Adds a Production instance to this grammar. If a Production instance
 * corresponding to the lhs nonterminal is already present, then merges
 * the two.
 */
Grammar.prototype.addProduction = function(production) {
  var nonterminal = production.lhs;
  if (this.productions[nonterminal.ch]) {
    // If a rule for this nonterminal Symbol is already present, add the
    // additional SymArray rules individually to prevent duplicates.
    var currentProduction = this.productions[nonterminal.ch];
    for (var i = 0; i < production.rhs.length; i++) {
      if (!currentProduction.rhsContains(production.rhs[i])) {
        currentProduction.rhs.push(production.rhs[i]);
      }
    }
  } else {
    this.productions[nonterminal.ch] = production;
    this.nonterminals.push(nonterminal.ch);
  }
};

/**
 * First line identifies the start symbol. Subsequent lines are all of the
 * Production rows.
 */
Grammar.prototype.toString = function(showNonterminals, options) {
  var s = 'Start symbol: ';
  s += this.startSymbol.toString(showNonterminals, options) + '<br>';
  for (var i = 0; i < this.nonterminals.length; i++) {
    var symbol = this.nonterminals[i];
    s += this.productions[symbol].toString(showNonterminals, options) + '<br>';
  }
  return s;
};
