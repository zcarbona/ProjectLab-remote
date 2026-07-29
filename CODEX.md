

## Project Overview

This project is a full-stack calculator consisting of:

* **Backend:** Python + FastAPI
* **Frontend:** HTML, CSS, Vanilla JavaScript

The frontend is responsible only for the user interface and user interaction. The backend is responsible for evaluating mathematical expressions.

The backend already exposes the following endpoint:

```http
POST /calculate?expr=<expression>
```

Example:

```http
POST /calculate?expr=2+2*5-3
```

The backend safely parses and evaluates expressions using Python's `ast` module. It already supports operator precedence, parentheses, floating-point numbers, negative numbers, and long expressions. The frontend should never duplicate this logic.

---

# Project Structure

```
project/
│
├──src
    ├── back/
    │   ├── main.py              # FastAPI application
    │   ├── requirements.txt
    │   └── ...
    │
    └── front/
        ├── index.html           # Calculator layout
        ├── style.css            # Glassmorphism UI
        └── script.js            # Calculator logic (to be refactored)
```

---

# Current Problem

The existing `script.js` was written as a traditional two-operand calculator.

Its internal state is built around concepts similar to:

```javascript
num1
operator
currentInput
waitingForSecondOperand
isResultDisplayed
```

This architecture only supports one binary operation at a time.

Example:

```
2 + 2 -
```

Current behavior:

```
2+2
↓
4-
```

When the user types:

```
5
```

the calculator resets and becomes:

```
5
```

instead of continuing as:

```
4-5
```

This makes continuous expressions impossible because the calculator evaluates after every operator instead of building the full expression.

---

# Desired Architecture

Replace the operand-based state with an expression-based state.

Instead of storing operands separately, maintain a single expression string.

Example:

```javascript
const state = {
    expression: "",
    history: [],
    resultDisplayed: false,
    isError: false
};
```

Typing:

```
2
+
2
*
5
```

should simply build:

```
2+2*5
```

No calculation should happen while the user is typing.

---

# Calculation Flow

When the user presses "=":

Frontend sends:

```http
POST /calculate?expr=2+2*5
```

Backend evaluates the expression.

Backend returns:

```
12
```

Frontend displays:

Main display:

```
12
```

Secondary display:

```
2+2*5 =
```

No arithmetic should ever happen inside JavaScript.

---

# Behavior After a Result

After displaying a result:

Example:

```
2+2=
```

Display:

```
4
```

If the next key is an operator:

```
+
```

continue from the previous result:

```
4+
```

Typing:

```
5
```

becomes:

```
4+5
```

If instead the next key is a number:

```
7
```

start a completely new expression:

```
7
```

This should match the behavior of Windows Calculator.

---

# JavaScript Responsibilities

The frontend should only:

* Build the expression string
* Update the calculator display
* Handle keyboard shortcuts
* Manage calculation history
* Show toast notifications
* Copy results to the clipboard
* Monitor backend availability
* Send expressions to the backend
* Display returned results and errors

The frontend must **not**:

* Evaluate mathematical expressions
* Implement operator precedence
* Perform arithmetic
* Store separate operands
* Implement its own parser

---

# Backend Responsibilities

FastAPI is the single source of truth for calculations.

It should:

* Parse the expression
* Validate syntax
* Evaluate the AST
* Return the result
* Return descriptive errors for invalid expressions

---

# UI Constraints

The following files should remain visually unchanged:

* `index.html`
* `style.css`

Only `script.js` should be refactored.

Do not modify the HTML structure unless absolutely necessary.

Do not redesign the UI.

Do not remove existing features.

---

# Existing Features to Preserve

The refactor must preserve:

* Glassmorphism design
* History drawer
* Keyboard shortcuts
* Copy result button
* Toast notifications
* Server health indicator
* Responsive behavior
* Animations
* Accessibility attributes
* Existing FastAPI integration

---

# Refactoring Goals

Refactor `script.js` into a clean, maintainable, expression-based architecture.

The new implementation should:

* Remove all two-operand state management.
* Remove all local calculation functions.
* Remove sequential evaluation logic.
* Build expressions exactly as typed.
* Send only complete expressions to FastAPI.
* Use the backend as the only calculation engine.
* Be modular, readable, and easy to extend.

Prefer small, focused functions with clear responsibilities over large procedural blocks. Avoid duplicated logic and keep UI state management simple.
