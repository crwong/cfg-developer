/**
 * Implementation of the Earley parser.
 *
 * Christopher Wong, Stanford University, 2014
 */


/**
 * A State instance encapsulates the information contained in one state of
 * the Earley Parser algorithm. The lhs and symArray parameters correspond to
 * the production rule that is being recorded. The currentPosition is the
 * current index of the symbol that will be scanned next. If currentPosition
 * is equal to symArray.symbols.length, then scanning is complete. The
 * originPosition is the position in the input string in which the matching
 * of this production began.
 *
 * In order to track derivations, use the opt_prev pointer.
 *
 * In general, a State instance should be treated as immutable.
 */
function State(lhs, symArray, currentPosition, originPosition, prev) {
  // Basic error checking: Invalid currentPosition if it is negative
  // or greater than the length of the production rule.
  if (currentPosition < 0 || currentPosition > symArray.symbols.length) {
    var msg = "StateCurrentPositionOutOfBounds: [" +
              (new Production(lhs, [symArray])).toString() +
              "] with currentPosition = " + currentPosition;
    throw msg;
  }
  this.lhs = lhs;
  this.symArray = symArray;
  this.currentPosition = currentPosition;
  this.originPosition = originPosition;
  this.prev = prev;
  this.counter = ++State.counter;
  if (GRAMMAR_DEBUG) {
    console.log('CREATING ' + this.toString());
  }
};

/** Dummy symbol to be used in the very first State of the algorithm. */
State.START_LHS = new Symbol('', false, 0, 0, [], 0);
/** Keeps track of the current number of all States created. */
State.counter = 0;

/** Returns true if the start symbol is derived from the very first State. */
State.prototype.hasStart = function() {
  return this.lhs === State.START_LHS;
};

/** Returns true if scanning of the production has completed. */
State.prototype.isComplete = function() {
  return this.currentPosition === this.symArray.symbols.length;
};

/** Returns true if the very first state has completed scanning. */
State.prototype.isCompleteParse = function() {
  return this.hasStart() && this.isComplete();
};

/** Returns true if the next Symbol to scan is a nonterminal Symbol. */
State.prototype.hasNonterminalNext = function(nonterminal) {
  var nextSymbol = this.symArray.symbols[this.currentPosition];
  return nextSymbol ? nonterminal.equals(nextSymbol) : false;
};

/** Returns the next Symbol to be scanned. */
State.prototype.getNextSymbol = function() {
  if (this.currentPosition === this.symArray.symbols.length) {
    return null;
  }
  return this.symArray.symbols[this.currentPosition];
}

/** Returns the new State obtained by scanning one Symbol. */
State.prototype.getAdvancedState = function(prev, scanned) {
  return new State(this.lhs, this.symArray, this.currentPosition + 1,
    this.originPosition, prev, scanned);
};

/**
 * Two state instances are equal if all of their properties other than the
 * opt_prev pointer are the same.
 */
State.prototype.equals = function(other) {
  return this.lhs.equals(other.lhs) &&
         this.symArray.equals(other.symArray) &&
         this.currentPosition === other.currentPosition &&
         this.originPosition === other.originPosition;
};

/**
 * Prints the tuple of information that represents a State. Displays the
 * current scanning position with a dot within the production substring.
 * If showPrev is true, also prints the previous State.
 */
State.prototype.toString = function(showNonterminals, showPrev) {
  var arr1 = this.symArray.symbols.slice(0, this.currentPosition);
  var arr2 = this.symArray.symbols.slice(this.currentPosition);
  var tempProduction = new Production(this.lhs, [new SymArray(arr1)]);
  var str = tempProduction.toString(showNonterminals);
  if (this.currentPosition === 0 && this.symArray.symbols.length !== 0) {
    // Remove the epsilon character unless original symArray is epsilon.
    str = str.substr(0, str.length - 1);
  }
  // Add dot to represent current position.
  str += '\u2022';
  if (this.currentPosition !== this.symArray.symbols.length) {
    str += (new SymArray(arr2)).toString(showNonterminals);
  }
  str = '(' + str + ' ; ' + this.originPosition + ')';
  if (showPrev && this.prev) {
    str += ' Prev: ['
    for (var i = 0; i < this.prev.length; i++) {
      str += this.prev[i].counter;
      if (i !== this.prev.length - 1) {
        str += ',';
      }
    }
    str += ']'
  }
  return this.counter + ' ' + str;
};


/**
 * A Context instance helps the Earley Parser algorithm keep track of
 * all the States and ensure that no duplicate States are added to the set.
 * The states property is a dictionary in which the keys are the index at
 * each point of the input string are the values are the set of States.
 */
function Context(input) {
  this.input = input;
  this.states = {};
  for (var i = 0; i <= input.length; i++) {
    this.states[i] = [];
  }
};

/**
 * Utility function returns State if the set of states at the inputIndex
 * already contains an equivalent State. Use this function to prevent
 * duplicate States from being added to the set. Returns null otherwise.
 */
Context.prototype.getState = function(state, inputIndex) {
  for (var i = 0; i < this.states[inputIndex].length; i++) {
    if (this.states[inputIndex][i].equals(state)) {
      return this.states[inputIndex][i];
    }
  }
  return null;
};

/**
 * Adds a State to the set of States. Ensures that duplicate States are not
 * added to the set. Returns true if a new State was pushed. False otherwise.
 */
Context.prototype.addState = function(state, inputIndex) {
  // Basic error checking: Invalid if inputIndex is negative or too long.
  if (inputIndex < 0 || inputIndex > this.input.length + 1) {
    var msg = "StateInputIndexOutOfBounds: [" +
              state.toString() +
              "] with inputIndex = " + inputIndex;
    throw msg;
  }
  // To make the Earley parser code more readable, silently ignore state
  // additions for the first index that is out of bounds.
  if (inputIndex === this.input.length + 1)  {
    return false;
  }
  var equalState = this.getState(state, inputIndex);
  if (!equalState) {
    this.states[inputIndex].push(state);
    return true;
  } else {
    var addedPrev = false;
    for (var i = 0; i < state.prev.length; i++) {
      var newState = state.prev[i];
      if (!containsState(equalState.prev, newState, true)) {
        equalState.prev.push(newState);
        addedPrev = true;
      }
    }
    return addedPrev;
  }
};

/**
 * Returns a string that represents the entire set of States. Each line
 * corresponds to the set of States for a particular input index.
 */
Context.prototype.toString = function(showNonterminals) {
  var str = '';
  for (var i = 0; i <= this.input.length; i++) {
    var tempStr = 'S(' + i + '): {\n';
    for (var j = 0; j < this.states[i].length; j++) {
      tempStr += '  ' + this.states[i][j].toString(showNonterminals, true);
      if (j !== this.states[i].length - 1) {
        tempStr += ', ';
      }
      tempStr += '\n';
    }
    str += tempStr + '}\n';
  }
  return str;
};


/**
 * Implementation of the Earley Parser algorithm which uses the given CFG.
 */
 function Earley(grammar) {
  this.grammar = grammar;
  this.currentContext = null;
};

Earley.DERIVATION_LIMIT = 50000;

/**
 * Uses the Earley Parser algorithm to determine if the input string matches
 * the given CFG. If the string matches, returns the final State from which
 * the derivation can be derived by traversing the prev pointers. Otherwise,
 * returns null.
 */
Earley.prototype.doesMatch = function(input) {
  // Create a new context
  var context = new Context(input);
  this.currentContext = context;
  // Initialize the algorithm with the very first start State.
  var startSymArray = new SymArray([this.grammar.startSymbol]);
  var startState = new State(State.START_LHS, startSymArray, 0, 0, [], 0);
  context.addState(startState, 0);

  for (var i = 0; i <= input.length; i++) {
    var states = context.states[i];
    // Important that we check against states.length instead of caching the
    // value, since this is a dynamic programming algorithm and the length
    // of states may increase while we are iterating.
    for (var j = 0; j < states.length; j++) {
      var newAddedStates = true;
      while (newAddedStates) {
        newAddedStates = false;
        var len = states.length;
        for (var k = 0; k < len; k++) {
          var state = states[k];
          if (GRAMMAR_DEBUG) {
            console.log('EXAMINING ' + state.toString(false, true));
          }

          var nextSymbol = state.getNextSymbol();
          if (nextSymbol && !nextSymbol.isTerminal) {
            // PREDICTION
            var production = this.grammar.productions[nextSymbol.ch];
            for (var l = 0; l < production.rhs.length; l++) {
              var next = new State(nextSymbol, production.rhs[l],
                                       0, i, [state], 0);
              if (context.addState(next, i)) {
                newAddedStates = true;
              }
            }

          } else if (state.isComplete()) {
            // COMPLETION
            var searchStates = context.states[state.originPosition];
            var ssLen = searchStates.length;
            for (var l = 0; l < ssLen; l++) {
              if (searchStates[l].hasNonterminalNext(state.lhs)) {
                var next = searchStates[l].getAdvancedState([state]);
                if (context.addState(next, i)) {
                  newAddedStates = true;
                }
              }
            }
          }
        }
        if (GRAMMAR_DEBUG) {
          console.log(context.toString());
        }
      }

      if (GRAMMAR_DEBUG) {
        console.log('EXAMINING ' + state.toString(false, true));
      }
      var state = states[j];
      var nextSymbol = state.getNextSymbol();
      if (nextSymbol && nextSymbol.isTerminal) {
        // SCANNING
        if (input[i] === nextSymbol.ch) {
          var next = state.getAdvancedState([state]);
          context.addState(next, i + 1);
        }
      }

      // Debugging info logs the Context after examining this State.
      if (GRAMMAR_DEBUG) {
        console.log(context.toString());
      }
    }
  }

  // Iterate through all States corresponding to the input length index, and
  // see if there was a match. Return the completed start State if there
  // was a match. Otherwise, return null.
  var checkStates = context.states[input.length];
  var match = null;
  for (var i = 0; i < checkStates.length && !match; i++) {
    if (checkStates[i].isCompleteParse()) {
      match = getDerivation(checkStates[i], input);
      break;
    }
  }
  this.currentContext = null;
  return match;
};

/**
 * Gets correct derivation, using backtracking recursion and the State prev
 * pointers. Returns an array of states with a correct derivation, where
 * the complete parse state is at index 0 and the start state is at the end.
 */
function getDerivation(match, input) {
  var queue = [[match]];
  var strings = [match.symArray.toString(false)];
  var counter = 0;
  var originalInput = input;
  input = escapeHTML(input);
  while (queue.length !== 0) {
    var states = queue.shift();
    var currentSymString = strings.shift();
    if (GRAMMAR_DEBUG) {
      console.log('DEQUEUE: ' + foo(states, false) + ' ' + currentSymString);
    }
    var currentState = states[states.length - 1];

    for (var i = 0; i < currentState.prev.length; i++) {
      var newState = currentState.prev[i];
      if (GRAMMAR_DEBUG) {
        console.log('   LOOKING AT: ' + newState.toString(false, true));
      }
      var newStates = states.concat([newState]);
      var newSymString = currentSymString;
      if (newState.currentPosition === newState.symArray.symbols.length) {
        var insertString = newState.symArray.symbols.length === 0 ?
                               '' : newState.symArray.toString(false);
        newSymString = replaceLastNonterminalStr(currentSymString,
                           newState.lhs.toString(false), insertString);
      }
      if (newSymString === input) {
        return newStates;
      }
      if (GRAMMAR_DEBUG) {
        console.log('ENQUEUE: ' + foo(newStates, false) + ' ' + newSymString);
      }
      strings.push(newSymString);
      queue.push(newStates);
      counter++;
      if (counter > Earley.DERIVATION_LIMIT) {
        console.log('[Earley] Derivation limit reached: ' + originalInput);
        return [];
      }
    }
  }
  return [];
}

function foo(states, newline) {
  var str = ' [' + (newline ? '\n' : '');
  for (var i = 0; i < states.length; i++) {
    str += (newline ? '    ' : '') + states[i].toString(false, true) + ',' + (newline ? '\n' : '');
  }
  return str + '] ';
}

/**
 * Returns true if the prev arrays of state1 and state2 are equal.
 * Returns false otherwise.
 */
function prevArraysEqual(state1, state2) {
  var prev1 = state1.prev;
  var prev2 = state2.prev;
  if (prev1.length !== prev2.length) {
    return false;
  }
  for (var i = 0; i < prev1.length; i++) {
    if (prev1[i].counter !== prev2[i].counter) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if states contains state. Optionally checks the prev arrays.
 */
function containsState(states, state, opt_checkprev) {
  for (var i = 0; i < states.length; i++) {
    if (states[i].equals(state) &&
        (!opt_checkprev || prevArraysEqual(states[i], state))) {
      return true;
    }
  }
  return false;
}

/**
 * Replaces the last nonterminal Symbol in the string with Symbols in the
 * insertString. Returns newly constructed String. This is an optimization
 * for finding derivations.
 */
function replaceLastNonterminalStr(symString, lhsString, insertString) {
  var i = symString.lastIndexOf(lhsString);
  if (i === -1) {
    return symString;
  }
  return symString.substring(0, i) + insertString + symString.substring(i + 1);
}

/**
 * Replaces the last nonterminal Symbol in SymArray with the Symbols in
 * insertArray. Returns the newly constructed SymArray.
 */
function replaceLastNonterminal(symArray, lhs, insertArray) {
  for (var i = symArray.symbols.length - 1; i >= 0; i--) {
    var symbol = symArray.symbols[i];
    if (!symbol.isTerminal && symbol.equals(lhs)) {
      var result = symArray.symbols.slice(0, i).concat(insertArray.symbols);
      result = result.concat(symArray.symbols.slice(i + 1));
      return new SymArray(result);
    }
  }
  return symArray;
};
