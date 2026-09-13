const { test } = require("node:test");
const assert = require("node:assert/strict");

/**
 * Re-create or test exported calculator logic matching AmountCalculatorModal
 */
function evaluateExpression(expr) {
  const sanitized = expr.replace(/×/g, "*").replace(/÷/g, "/").trim();
  if (!sanitized || sanitized === "-") return 0;

  const tokens = [];
  let currentNum = "";

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if ((char >= "0" && char <= "9") || char === ".") {
      currentNum += char;
    } else if (["+", "-", "*", "/"].includes(char)) {
      if (currentNum !== "") {
        tokens.push(parseFloat(currentNum) || 0);
        currentNum = "";
      } else if (
        char === "-" &&
        (tokens.length === 0 || typeof tokens[tokens.length - 1] === "string")
      ) {
        currentNum = "-";
        continue;
      }
      tokens.push(char);
    }
  }

  if (currentNum !== "" && currentNum !== "-") {
    tokens.push(parseFloat(currentNum) || 0);
  }

  if (tokens.length === 0) return 0;
  if (tokens.length === 1 && typeof tokens[0] === "number") return tokens[0];

  const pass1 = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "*" || token === "/") {
      const prev = pass1.pop();
      const next = tokens[++i];
      if (typeof prev === "number" && typeof next === "number") {
        pass1.push(token === "*" ? prev * next : next !== 0 ? prev / next : 0);
      } else {
        pass1.push(prev ?? 0);
      }
    } else {
      pass1.push(token);
    }
  }

  let result = typeof pass1[0] === "number" ? pass1[0] : 0;
  for (let i = 1; i < pass1.length; i += 2) {
    const op = pass1[i];
    const next = pass1[i + 1];
    if (typeof next === "number") {
      if (op === "+") result += next;
      if (op === "-") result -= next;
    }
  }

  return Number.isFinite(result) ? result : 0;
}

function isMathExpression(expr) {
  const trimmed = expr.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes("+") ||
    trimmed.includes("×") ||
    trimmed.includes("÷") ||
    trimmed.includes("*") ||
    trimmed.includes("/")
  ) {
    return true;
  }
  const withoutLeadingMinus = trimmed.startsWith("-")
    ? trimmed.slice(1).trim()
    : trimmed;
  return withoutLeadingMinus.includes("-");
}

function toggleSign(expr) {
  if (!expr || expr === "0") return "-";
  if (expr === "-") return "";
  const match = expr.match(/(-?\d+\.?\d*)$/);
  if (!match) {
    if (expr.endsWith("-")) {
      return expr.slice(0, -1).trimEnd();
    }
    return expr + "-";
  }
  const lastNumStr = match[0];
  const startIndex = match.index ?? 0;
  const prefix = expr.slice(0, startIndex);
  const toggled = lastNumStr.startsWith("-")
    ? lastNumStr.slice(1)
    : "-" + lastNumStr;
  return prefix + toggled;
}

function formatWithCommas(val) {
  if (!val) return "0";
  if (val === "-") return "-";
  const isNegative = val.startsWith("-");
  const unsigned = isNegative ? val.slice(1) : val;
  const parts = unsigned.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  return isNegative ? `-${formatted}` : formatted;
}

test("calculator: directly evaluates negative numbers and expressions", () => {
  assert.equal(evaluateExpression("-50"), -50);
  assert.equal(evaluateExpression("-50.25"), -50.25);
  assert.equal(evaluateExpression("-"), 0);
  assert.equal(evaluateExpression("50 - 100"), -50);
  assert.equal(evaluateExpression("-100 + 50"), -50);
  assert.equal(evaluateExpression("100 + -50"), 50);
  assert.equal(evaluateExpression("100 * -5"), -500);
  assert.equal(evaluateExpression("100 / -4"), -25);
});

test("calculator: distinguishes lone negative numbers from math formulas", () => {
  assert.equal(isMathExpression(""), false);
  assert.equal(isMathExpression("-"), false);
  assert.equal(isMathExpression("-50"), false);
  assert.equal(isMathExpression("-50.25"), false);
  assert.equal(isMathExpression("50"), false);
  assert.equal(isMathExpression("100 - 50"), true);
  assert.equal(isMathExpression("-100 + 50"), true);
  assert.equal(isMathExpression("100 * -5"), true);
});

test("calculator: toggles sign seamlessly across numbers and operands", () => {
  assert.equal(toggleSign(""), "-");
  assert.equal(toggleSign("-"), "");
  assert.equal(toggleSign("50"), "-50");
  assert.equal(toggleSign("-50"), "50");
  assert.equal(toggleSign("50.25"), "-50.25");
  assert.equal(toggleSign("-50.25"), "50.25");
  assert.equal(toggleSign("100 + 50"), "100 + -50");
  assert.equal(toggleSign("100 + -50"), "100 + 50");
  assert.equal(toggleSign("100 × "), "100 × -");
  assert.equal(toggleSign("100 × -"), "100 ×");
});

test("calculator: formats negative amounts with commas", () => {
  assert.equal(formatWithCommas("-"), "-");
  assert.equal(formatWithCommas("-5000"), "-5,000");
  assert.equal(formatWithCommas("-5000.50"), "-5,000.50");
  assert.equal(formatWithCommas("5000.50"), "5,000.50");
});
