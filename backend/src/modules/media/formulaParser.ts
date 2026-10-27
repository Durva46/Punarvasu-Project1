/**
 * backend/src/modules/media/formulaParser.ts
 *
 * Pure TypeScript Safe Expression Parser for Media Preparation formulas.
 * NO eval, NO Function constructor, NO external runtime dependencies.
 *
 * Supported Grammar:
 *   Expr    := Term ( ('+' | '-') Term )*
 *   Term    := Factor ( '*' Factor )*
 *   Factor  := Number | Variable | '(' Expr ')'
 *   Variable:= 'S' | 'W' | 'N'
 *
 * Strict token validation: rejects any unrecognized token or syntax error.
 */

export interface FormulaVariables {
  S: number; // Total samples registered on date
  W: number; // Samples containing 'water'
  N: number; // Non-water samples (S - W)
}

type TokenType = "NUMBER" | "VAR" | "PLUS" | "MINUS" | "MUL" | "LPAREN" | "RPAREN" | "EOF";

interface Token {
  type: TokenType;
  value: string | number;
}

/**
 * Tokenizer for the formula expression.
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let numStr = "";
      while (i < expr.length && /[0-9]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: parseInt(numStr, 10) });
      continue;
    }

    if (ch === "S" || ch === "W" || ch === "N") {
      tokens.push({ type: "VAR", value: ch });
      i++;
      continue;
    }

    if (ch === "+") {
      tokens.push({ type: "PLUS", value: "+" });
      i++;
      continue;
    }
    if (ch === "-") {
      tokens.push({ type: "MINUS", value: "-" });
      i++;
      continue;
    }
    if (ch === "*") {
      tokens.push({ type: "MUL", value: "*" });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    throw new Error(`Unexpected character '${ch}' in formula expression "${expr}"`);
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

/**
 * Safe Recursive Descent Parser
 */
class Parser {
  private tokens: Token[];
  private pos = 0;
  private vars: FormulaVariables;

  constructor(tokens: Token[], vars: FormulaVariables) {
    this.tokens = tokens;
    this.vars = vars;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private consume(expectedType?: TokenType): Token {
    const tok = this.peek();
    if (expectedType && tok.type !== expectedType) {
      throw new Error(`Expected token ${expectedType} but found ${tok.type} ('${tok.value}')`);
    }
    this.pos++;
    return tok;
  }

  public parse(): number {
    const val = this.expr();
    if (this.peek().type !== "EOF") {
      throw new Error(`Unexpected trailing token '${this.peek().value}' in formula`);
    }
    return val;
  }

  // Expr := Term ( ('+' | '-') Term )*
  private expr(): number {
    let result = this.term();

    while (this.peek().type === "PLUS" || this.peek().type === "MINUS") {
      const op = this.consume().type;
      const right = this.term();
      if (op === "PLUS") result += right;
      else result -= right;
    }

    return result;
  }

  // Term := Factor ( '*' Factor )*
  private term(): number {
    let result = this.factor();

    while (this.peek().type === "MUL") {
      this.consume();
      const right = this.factor();
      result *= right;
    }

    return result;
  }

  // Factor := Number | Variable | '(' Expr ')'
  private factor(): number {
    const tok = this.peek();

    if (tok.type === "NUMBER") {
      this.consume();
      return tok.value as number;
    }

    if (tok.type === "VAR") {
      this.consume();
      const varName = tok.value as keyof FormulaVariables;
      const val = this.vars[varName];
      if (val === undefined || isNaN(val)) {
        throw new Error(`Variable ${varName} is undefined`);
      }
      return val;
    }

    if (tok.type === "LPAREN") {
      this.consume();
      const val = this.expr();
      this.consume("RPAREN");
      return val;
    }

    throw new Error(`Unexpected token '${tok.value}' (${tok.type}) when parsing factor`);
  }
}

/**
 * Evaluates a formula text safely given variables S, W, N.
 * Never alters or simplifies the expression text.
 */
export function evaluateFormula(expressionText: string, vars: FormulaVariables): number {
  if (!expressionText || !expressionText.trim()) {
    throw new Error("Formula expression cannot be empty");
  }
  const tokens = tokenize(expressionText);
  const parser = new Parser(tokens, vars);
  return parser.parse();
}

/**
 * Calculates quantity used in grams:
 * Quantity Used = tube_plates * quantity_per_tube
 * Returns stored quantity (4 decimal places) and display quantity (2 decimal places).
 */
export function calculateQuantityUsed(tubePlates: number, quantityPerTube: number | null): {
  storedGm: number | null;
  displayGm: string | null;
} {
  if (quantityPerTube === null || isNaN(quantityPerTube)) {
    return { storedGm: null, displayGm: null };
  }
  const raw = tubePlates * quantityPerTube;
  const storedGm = parseFloat(raw.toFixed(4));
  const displayGm = storedGm.toFixed(2);
  return { storedGm, displayGm };
}
