/**
 * Controls dynamic grammar web page.
 *
 * Christopher Wong, Stanford University, 2014
 */


/**
 * Utility function which returns the position of the caret in a text field.
 * Supports older versions of IE.
 */
function getCaretPosition(textField) {
  var pos = 0;
  if (document.selection) {
    // Older versions of IE.
    textField.focus();
    var sel = document.selection.createRange();
    sel.moveStart('character', -textField.value.length);
    pos = sel.text.length;
  } else if (typeof textField.selectionStart === 'number') {
    pos = textField.selectionStart;
  }
  return pos;
};

/**
 * Utility function which sets the position of the caret in a text field.
 * Currently no guaranteed support for older versions of IE.
 */
function setCaretPosition(textField, index) {
  if (index > textField.value.length) {
    index = textField.value.length;
  }
  textField.selectionStart = index;
  textField.selectionEnd = index;
};

/**
 * Utility function to focus on a text field. Since we are adding various DOM
 * elements via JavaScript and they may not be immediately visible, we set
 * a small window timeout before the call.
 */
function startFocus(textField) {
  window.setTimeout(function() { textField.focus(); }, 50);
};

/**
 * Utility function to test the user's CFG. Since we are adding various DOM
 * elements via JavaScript and they may not be immediately visible, we set
 * a small window timeout before the call.
 */
function startTest() {
  window.setTimeout(function() { testCFG(); }, 50);
};


/**
 * First function to call once the document is ready.
 */
function initializeGrammarDOM() {
  // Create the first production row.
  newProduction(true);

  // Bind click handlers.
  $('#new-production').click(function(event) { newProduction(false); });
  $('#reset').click(function(event) { resetGrammar(); });
  $('#example').click(function(event) { exampleGrammar(); });

  // Retest CFG any time a key is pressed in the test strings textarea.
  $('#test-input').keyup(testCFG);
};

/**
 * Creates a new production row.
 */
function newProduction(isStart) {
  // Create the outer production-row div container.
  var formGroup = jQuery('<div/>', {'class': 'production-row'});

  // Nonterminal input field.
  var ntDiv = jQuery('<div/>', {'class': 'col-xs-nt'}).appendTo(formGroup);
  var ntInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control nonterminal',
    'maxlength': '1'
  }).appendTo(ntDiv).keydown(handleNtInput).keyup(handleKeyup);

  // Arrow.
  jQuery('<div/>', {'class': 'arrow', 'html': '&#8594;'}).appendTo(formGroup);

  // First production rule.
  var prDiv = jQuery('<div/>', {'class': 'col-xs-pr'}).appendTo(formGroup);
  var prInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control rule',
    'placeholder': '\u03B5'
  }).appendTo(prDiv).keydown(handlePrInput).keyup(handleKeyup);

  if (isStart) {
    // First production row has read-only start symbol.
    ntInput.attr({'value': 'S', 'readonly': '', 'id': 'start-symbol'});
    startFocus(prInput);
  } else {
    // All subsequent production rows have a button to remove the entire row.
    var rmDiv = jQuery('<div/>', {'class': 'remove'}).appendTo(formGroup);
    var rmSpan = jQuery('<span/>', {
      'class': 'glyphicon glyphicon-remove-circle remove-button',
      'title': 'Remove this production'
    }).appendTo(rmDiv);
    rmSpan.click(function(event) {
      // Click handler removes the production row and retests the CFG.
      clearCache();
      formGroup.remove();
      startTest();
    });
    startFocus(ntInput);
  }

  // Add to grammar.
  formGroup.appendTo($('#grammar'));
  jQuery('<div/>', {'class': 'clearfix'}).appendTo($('#grammar'));
  return formGroup;
};

/**
 * Creates a new rule for the production row. Since this is called by the user
 * inputting the pipe '|' character, we split the text at the caret position.
 */
function newRule(base) {
  // New production rule.
  var prDiv = jQuery('<div/>', {
    'class': 'col-xs-pr'
  }).insertAfter(base.parentNode);
  var prInput = jQuery('<input/>', {
    'type': 'text',
    'class': 'form-control rule',
    'placeholder': '\u03B5'
  }).appendTo(prDiv).keydown(handlePrInput).keyup(handleKeyup).focus();

  // OR pipe character.
  jQuery('<div/>', {
    'class': 'or',
    'html': '&#124'
  }).insertAfter(base.parentNode);

  // Set the values of the target and new text fields based on where the
  // target string value should be split.
  var pos = getCaretPosition(base);
  var val = base.value;
  base.value = val.substring(0, pos);
  prInput.attr({'value': val.substring(pos)});
  return prDiv;
};


function handleKeyup(event) {
  var input = event.currentTarget;
  var pos = getCaretPosition(input);
  input.value = input.value.replace(/\|/g, '');
  setCaretPosition(input, pos);

  // Retest CFG any time a key is pressed.
  startTest();
}


/**
 * Key listener for user input in a production rule field.
 */
function handlePrInput(event) {
  var input = event.currentTarget;
  if (!handleCommonInput(event)) {
    switch (event.which) {
      case 8: {
        // Backspace = Merge rules if backspace is against an OR.
        if (getCaretPosition(input) === 0 &&
            input.selectionStart === input.selectionEnd) {
          handlePrBackspace(input);
          event.preventDefault();
        }
        break;
      }
      case 220: {
        // Pipe '|' character = Create new rule.
        if (event.shiftKey) {
          event.preventDefault();
          newRule(input);
          break;
        }
      }
    }
  }
};

/**
 * Key listener for user input in a nonterminal field.
 */
function handleNtInput(event) {
  handleCommonInput(event);
};

/**
 * Handles key events common to nonterminal and production rule text fields.
 * Returns true if a handler was called, except for the pipe character.
 */
function handleCommonInput(event) {
  clearCache();
  var input = event.currentTarget;
  switch (event.which) {
    case 13: {
      // Enter = Create new production.
      event.preventDefault();
      newProduction(false);
      return true;
    }
    case 37: {
      // Left arrow key = Possibly jump to previous text field in row.
      if (getCaretPosition(input) === 0) {
        event.preventDefault();
        handleLeftArrow(input);
      }
      return true;
    }
    case 39: {
      // Right arrow key = Possibly jump to next text field in row.
      if (getCaretPosition(input) === input.value.length) {
        event.preventDefault();
        handleRightArrow(input);
      }
      return true;
    }
    case 220: {
      // Pipe '|' character = Consume event.
      if (event.shiftKey) {
        event.preventDefault();
      }
    }
  }
  return false;
};

/**
 * Utility function to move the focus to the previous text field upon a left
 * arrow key. Call this function if the caret position of the text field is 0.
 */
function handleLeftArrow(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv === null) {
    // Do not continue if we are at the very left of the row.
    return;
  }
  var targetInput = previousDiv.previousSibling.firstChild;
  if (targetInput.id !== 'start-symbol') {
    targetInput.focus();
    setCaretPosition(targetInput, targetInput.value.length);
  }
};

/**
 * Utility function to move the focus to the next text field upon a right
 * arrow key. Call this function if the caret position of the text field is
 * at the end.
 */
function handleRightArrow(input) {
  var nextDiv = input.parentNode.nextSibling;
  if (nextDiv === null || nextDiv.className === 'remove') {
    // Do not continue if the next div is null or the remove button.
    return;
  }
  var targetInput = nextDiv.nextSibling.firstChild;
  targetInput.focus();
  setCaretPosition(targetInput, 0);
};

/**
 * Utility function to merge two production rules upon a backspace. Call this
 * function if the caret position of the text field is 0.
 */
function handlePrBackspace(input) {
  var previousDiv = input.parentNode.previousSibling;
  if (previousDiv.className === 'arrow') {
    // Do not delete the text field if it is the first production rule.
    return;
  }
  var mergeInput = previousDiv.previousSibling.firstChild;
  var originalValue = mergeInput.value;
  mergeInput.value += input.value;
  mergeInput.focus();
  // Set the appropriate caret position after the call to focus().
  setCaretPosition(mergeInput, originalValue.length);
  previousDiv.remove();
  input.parentNode.remove();
};


/**
 * Handler to reset the CFG.
 */
function resetGrammar() {
  var msg = 'Resetting will erase the current CFG. Are you sure?';
  if (window.confirm(msg)) {
    $('#grammar').empty();
    clearCache();
    newProduction(true);
    startTest();
  }
};

/**
 * Handler to fill in an example CFG.
 */
function exampleGrammar() {
  var msg = 'Showing an example CFG will overwrite the current CFG *and* ' +
            'test strings. Are you sure?';
  if (window.confirm(msg)) {
    $('#grammar').empty();
    clearCache();
    newProduction(true)[0].lastChild.firstChild.value = 'T+T';
    var prod2 = newProduction(false);
    prod2[0].firstChild.firstChild.value = 'T';
    var ruleInput = prod2[0].firstChild.nextSibling.nextSibling.firstChild;
    for (var i = 1; i < 4; i++) {
      ruleInput.value = '' + i;
      ruleInput = newRule(ruleInput)[0].firstChild;
    }
    ruleInput.value = '' + 4;
    $('#test-input').val('1+2\n4+2\n\n2+5\n3+3');
    startTest();
  }
};


/**
 * Tests the current CFG input by the user. Reads the strings from the test
 * strings textarea, and for each string, uses the Early Parser algorithm
 * to determine whether the strings matches the CFG. If there is a match,
 * we display one possible derivation as well.
 */
function testCFG() {
  // Empty the current table.
  var tbody = $('#results');
  tbody.empty();

  // Obtain the test strings and read the user CFG.
  var strings = $('#test-input').val().split(/\r?\n/);
  var grammar = readGrammar();
  var earley = new Earley(grammar);
  // Display the toString() version of the Grammar to the user.
  // Note that the toString() version gives direct HTML.
  $('#current-grammar').html(grammar.toString(true, Symbol.BOLD));

  // Test each string
  for (var i = 0; i < strings.length; i++) {
    var str = strings[i];
    // Current string is a match if matchState is not null or undefined.
    var matchState = testCFG.cache[str];
    if (matchState === undefined) {
      matchState = earley.doesMatch(str);
      testCFG.cache[str] = matchState;
      testCFG.cacheQueue.push(str);
      if (testCFG.cacheQueue.length > testCFG.MAX_CACHE_SIZE) {
        delete testCFG.cache[testCFG.cacheQueue.shift()];
      }
    } else {
      var index = testCFG.cacheQueue.indexOf(str);
      testCFG.cacheQueue.splice(index, 1);
      testCFG.cacheQueue.push(str);
    }

    // Call escapeHTML() from grammar.js
    str = escapeHTML(str);
    var isMatch = !!matchState;
    // The row in the results table reports whether the string is a match
    // and is also color coded.
    var row = $('<tr/>', {'class': isMatch ? 'success' : 'danger'})
                .append($('<td/>', {'html': (i + 1)}))
                .append($('<td/>', {'html': '&quot;' + str + '&quot;'}))
                .append($('<td/>', {'html': isMatch ? 'Yes' : 'No'}));
    var lastTd = $('<td/>', {'class': 'derivation-cell'}).appendTo(row);
    tbody.append(row);

    if (isMatch && matchState.length !== 0) {
      // If the string is a match, show the derivation.
      lastTd.append($('<a/>', {
        'data-toggle': 'collapse',
        'class': 'derivation-toggle',
        'data-target': '#deriv-' + (i + 1),
        'html': 'See Derivation'
      }));
      var derivationRow = getDerivationRow(matchState, i);
      tbody.append(derivationRow);
    }
  }

  // Just in case someone wants to try number overflow
  State.counter = 0;
};

testCFG.cacheQueue = [];
testCFG.cache = {};
testCFG.MAX_CACHE_SIZE = 50;

function clearCache() {
  testCFG.cacheQueue = [];
  testCFG.cache = {};
}


/**
 * Reads the user input CFG and returns a Grammar instance.
 */
function readGrammar() {
  var grammar;
  var startSymbol;
  var nonterminals = {};

  // Iterate through all production rows to first gather the nonterminals.
  $('div.production-row').each(function(index, row) {
    var ch = row.firstChild.firstChild.value;
    if (ch === '') {
      // If there is no nonterminal character, then ignore the row.
      return;
    }
    nonterminals[ch] = true;
    if (index === 0) {
      // The first production row gives us the start symbol to initialize
      // the Grammar.
      grammar = new Grammar(new Symbol(ch, false));
    }
  });

  // Now iterate through all production rows to construct the Grammar.
  $('div.production-row').each(function(index, row) {
    var currentDiv = row.firstChild;
    var ch = currentDiv.firstChild.value;
    if (ch === '') {
      // If there is no nonterminal character, then ignore the row.
      return;
    }
    var lhs = new Symbol(ch, false);
    var production = new Production(lhs);

    // Iterate through all production rules to add to the Production.
    while (currentDiv = currentDiv.nextSibling.nextSibling) {
      var symbols = [];
      var str = currentDiv.firstChild.value;
      // Create a Symbol for each character in the text field's string.
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        symbols.push(new Symbol(ch, !nonterminals[ch]));
      }
      // Add SymArray to Production.
      production.addArray(new SymArray(symbols));
      if (currentDiv.nextSibling === null ||
          currentDiv.nextSibling.className === 'remove') {
        // Stop once the next div is null or the remove button.
        break;
      }
    }
    grammar.addProduction(production);
  });
  return grammar;
};

/**
 * Given the sequence of match states returned by the Earley Parser algorithm,
 * constructs a DOM table that shows the string matching derivation.
 */
function getDerivationRow(matchState, index) {
  var derivationRow = $('<tr/>', {'class': 'derivation-row active'});
  var derivationTd = $('<td/>', {'colspan': '4'}).appendTo(derivationRow);
  // Bootstrap collapse functionality.
  var collapseTarget = $('<div/>', {
    'class': 'panel-collapse collapse',
    'id': 'deriv-' + (index + 1)
  }).appendTo(derivationTd);
  var derivationDiv = $('<div/>', {
    'class': 'derivation'
  }).appendTo(collapseTarget);

  // The table showing the derivation has two columns.
  var derivationTable = $('<table/>', {'class': 'derivations'})
      .append($('<thead/>')
        .append($('<tr/>')
          .append($('<th/>', {'class': 'text-right', 'html': 'Rule'}))
          .append($('<th/>', {'html': 'Result'}))));
  var derivationBody = $('<tbody/>').appendTo(derivationTable);

  var derivations = formatDerivation(matchState);
  for (var j = 0; j < derivations.length; j++) {
    // For each [nonterminalString, productionString] object, insert the
    // corresponding string elements as HTML values in a table row.
    $('<tr/>')
      .append($('<td/>', {'class': 'text-right', 'html': derivations[j][0]}))
      .append($('<td/>', {'html': derivations[j][1]}))
      .appendTo(derivationBody);
  }
  derivationDiv.append(derivationTable);
  return derivationRow;
};

/**
 * Given the matchStates returned by the Earley Parser algorithm, parses the
 * relevant States and creates strings that look nice as HTML.
 */
function formatDerivation(matchStates) {
  var states = [];

  for (var i = 0; i < matchStates.length; i++) {
    if (matchStates[i].currentPosition ===
          matchStates[i].symArray.symbols.length) {
      states.push(matchStates[i]);
    }
  }

  // Debugging code logs the relevant States. Shows which will be used
  // to display the derivation.
  if (GRAMMAR_DEBUG) {
    var arr = [];
    for (var i = 0; i < states.length; i++) {
       arr.push(states[i].toString());
    }
    console.log(arr);
    console.log('FROM');
    var arr2 = [];
    for (var i = 0; i < matchStates.length; i++) {
       arr.push(matchStates[i].toString());
    }
    console.log(arr2);
  }

  // From the Array of States, create an Array of:
  //    [nonterminalString, productionString]
  // objects that look nice in HTML.
  var strings = [['<em>Start</em>', '<strong>S</strong>']];
  var symArray = states[0].symArray;
  for (var i = 1; i < states.length; i++) {
    var tempProduction = new Production(states[i].lhs, [states[i].symArray]);
    var arr = [];
    arr.push(tempProduction.toString(true, Symbol.BOLD));
    // Calling replaceLastNonterminal() from earley.js
    symArray = replaceLastNonterminal(symArray, states[i].lhs, states[i].symArray);
    arr.push(symArray.toString(true, Symbol.BOLD));
    strings.push(arr);
  }
  return strings;
};


/**
 * Base jQuery code pattern.
 */
$(document).ready(function() {
  initializeGrammarDOM();
  startTest();
});
