// Test file for grammar.js

/*
 * JS lines for console node.js to run this file in a shell.
function lf(path) { vm.runInThisContext(fs.readFileSync(path, 'utf-8'), path); }
lf('grammar.js');
lf('earley.js');
lf('grammar_test.js');
*/

// Run tests
test2(true, true);

// Simple epsilon grammar to test derivations
// S -> 0XX
// X -> eps | 1
// Test string: "01"
function test2(debug, show) {
  GRAMMAR_DEBUG = debug;
  SHOW_NONTERMINALS = show;
  var arr1 = [new Symbol('0', true), new Symbol('X', false), new Symbol('X', false)];
  var production1 = new Production(new Symbol('S', false), [new SymArray(arr1)]);
  var arr2 = [];
  var arr3 = [new Symbol('1', true)];
  var production2 = new Production(new Symbol('X', false),
      [new SymArray(arr2), new SymArray(arr3)]);
  var grammar1 = new Grammar(new Symbol('S', false));
  grammar1.addProduction(production1);
  grammar1.addProduction(production2);
  var earley1 = new Earley(grammar1);

  var matchState = earley1.doesMatch('01');
  console.log('******');

  for (var i = 0; i < matchState.length; i++) {
    console.log(matchState[i].toString(false, true));
  }
}

/**
 * Possible input grammar over language {0,1} for all palindromes.
 *
 * S -> 0S0 | 1S1
 * S -> 1S1 | 0 | 1
 * S -> 0 | 1 | eps
 *
 * S -> 0S0 | 1S1 | 0 | 1 | eps
 */
function test1(debug, show) {
  GRAMMAR_DEBUG = debug;
  SHOW_NONTERMINALS = show;
  var arr1 = [new Symbol('0', true), new Symbol('S', false), new Symbol('0', true)];
  var arr2 = [new Symbol('1', true), new Symbol('S', false), new Symbol('1', true)];
  var production1 = new Production(new Symbol('S', false),
     [new SymArray(arr1), new SymArray(arr2)]);

  var arr3 = [new Symbol('1', true), new Symbol('S', false), new Symbol('1', true)];
  var arr4 = [new Symbol('0', true)];
  var arr5 = [new Symbol('1', true)];
  var production2 = new Production(new Symbol('S', false),
     [new SymArray(arr3), new SymArray(arr4), new SymArray(arr5)]);

  var arr6 = [new Symbol('0', true)];
  var arr7 = [new Symbol('1', true)];
  var arr8 = [];
  var production3 = new Production(new Symbol('S', false),
     [new SymArray(arr6), new SymArray(arr7), new SymArray(arr8)]);

  var grammar1 = new Grammar(new Symbol('S', false));
  grammar1.addProduction(production1);
  grammar1.addProduction(production2);
  grammar1.addProduction(production3);

  // console.log(production1.toString(SHOW_NONTERMINALS));
  // console.log(production2.toString(SHOW_NONTERMINALS));
  // console.log(production3.toString(SHOW_NONTERMINALS));

  // console.log(grammar1.toString(SHOW_NONTERMINALS));


  var state1 = new State(production1.lhs, production1.rhs[0], 0, 3);
  var state2 = new State(production1.lhs, production1.rhs[0], 1, 2);
  var state3 = new State(production1.lhs, production1.rhs[0], 2, 1);
  var state4 = new State(production1.lhs, production1.rhs[0], 3, 0);
  // console.log(state1.toString(SHOW_NONTERMINALS));
  // console.log(state2.toString(SHOW_NONTERMINALS));
  // console.log(state3.toString(SHOW_NONTERMINALS));
  // console.log(state4.toString(SHOW_NONTERMINALS));

  var state5 = new State(production1.lhs, production3.rhs[1], 0, 0);
  // console.log(state5.toString(SHOW_NONTERMINALS));

  var state6 = new State(production2.lhs, production2.rhs[2], 0, 0);
  // console.assert(state5.equals(state6));

  var context1 = new Context('10101', grammar1);
  context1.addState(state5, 3);
  context1.addState(state1, 1);
  context1.addState(state3, 3);
  context1.addState(state6, 3);
  // console.log(context1.toString(SHOW_NONTERMINALS));


  var earley1 = new Earley(grammar1);
  console.log('SHOULD BE ALL TRUE');
  console.log(earley1.doesMatch('101'));
  console.log(earley1);
  console.log(grammar1.toString(true));
  console.log(earley1.doesMatch(''));
  console.log(earley1.doesMatch('110011'));
  console.log(earley1.doesMatch('10101010101'));
  console.log(earley1.doesMatch('100000001'));
  console.log(earley1.doesMatch('10000001'));
  console.log(earley1.doesMatch('1'));
  console.log(earley1.doesMatch('0'));
  console.log(earley1.doesMatch('11'));
  console.log(earley1.doesMatch('00'));
  console.log(earley1.doesMatch('101101'));
  console.log(earley1.doesMatch('10100101'));
  console.log('SHOULD BE ALL FALSE');
  console.log(earley1.doesMatch('110'));
  console.log(earley1.doesMatch('10'));
  console.log(earley1.doesMatch('01'));
  console.log(earley1.doesMatch('110'));
  console.log(earley1.doesMatch('011'));
  console.log(earley1.doesMatch('111100110001111'));
  console.log(earley1.doesMatch('111100011001111'));
  console.log(earley1.doesMatch('10101010'));
  console.log(earley1.doesMatch('10110'));
  console.log(earley1.doesMatch('1000000000010'));
  console.log(earley1.doesMatch('100010010101010101101000101'));
  console.log(earley1.doesMatch('01010100010101100101010100000'));
  console.log(earley1.doesMatch('3'));
  console.log(earley1.doesMatch('10S01'));
}