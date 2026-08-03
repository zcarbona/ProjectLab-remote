from __future__ import annotations

import ast
import operator as op
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Glassmorphic Calculator API",
    description="A safe, high-performance expression evaluation API.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_BIN_OPS: dict[type[ast.AST], Any] = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
}

_UNARY_OPS: dict[type[ast.AST], Any] = {
    ast.UAdd: op.pos,
    ast.USub: op.neg,
}

_MAX_EXPONENT: float = 1000.0


class HealthResponse(BaseModel):
    message: str
    status: str


class CalculationResponse(BaseModel):
    expression: str
    result: float


def safe_eval(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return safe_eval(node.body)

    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(
            node.value, (int, float)
        ):
            raise TypeError("Unsupported constant type")
        return node.value

    if isinstance(node, ast.BinOp):
        left = safe_eval(node.left)
        right = safe_eval(node.right)
        op_type = type(node.op)
        if op_type not in _BIN_OPS:
            raise TypeError(f"Unsupported binary operator: {op_type.__name__}")
        if op_type is ast.Div or op_type is ast.FloorDiv or op_type is ast.Mod:
            if right == 0:
                raise ZeroDivisionError("Division or modulo by zero")
        if op_type is ast.Pow and abs(right) > _MAX_EXPONENT:
            raise ValueError("Exponent too large")
        return _BIN_OPS[op_type](left, right)

    if isinstance(node, ast.UnaryOp):
        operand = safe_eval(node.operand)
        op_type = type(node.op)
        if op_type not in _UNARY_OPS:
            raise TypeError(f"Unsupported unary operator: {op_type.__name__}")
        return _UNARY_OPS[op_type](operand)

    raise TypeError("Unsupported expression")


def normalize_expression(expr_str: str) -> str:
    replacements = {
        "×": "*",
        "÷": "/",
        "−": "-",
        "−": "-",
        "\u2212": "-",
        "\u00d7": "*",
        "\u00f7": "/",
    }
    cleaned = expr_str
    for src, dst in replacements.items():
        cleaned = cleaned.replace(src, dst)
    cleaned = "".join(cleaned.split())
    if not cleaned:
        raise ValueError("Empty expression")
    return cleaned


def evaluate_expression(expr_str: str) -> float:
    cleaned = normalize_expression(expr_str)
    try:
        tree = ast.parse(cleaned, mode="eval")
    except SyntaxError:
        raise HTTPException(status_code=400, detail="Invalid expression syntax")
    try:
        result = float(safe_eval(tree))
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Cannot divide by zero")
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid expression: {exc}")
    except OverflowError:
        raise HTTPException(status_code=400, detail="Result too large")
    return result


def compute_legacy(operator: str, num1: float, num2: float) -> float:
    match operator:
        case "*":
            return num1 * num2
        case "+":
            return num1 + num2
        case "-":
            return num1 - num2
        case "/":
            if num2 == 0:
                raise HTTPException(
                    status_code=400, detail="Cannot divide by zero"
                )
            return num1 / num2
        case _:
            raise HTTPException(status_code=400, detail="Invalid operator")


@app.get("/", response_model=HealthResponse)
async def root() -> HealthResponse:
    return HealthResponse(message="Hello World", status="online")


@app.post("/calculate", response_model=CalculationResponse)
async def calculator(
    operator: str | None = Query(
        default=None, description="Legacy single-char operator (+, -, *, /)"
    ),
    num1: float | None = Query(default=None, description="First operand"),
    num2: float | None = Query(default=None, description="Second operand"),
    expr: str | None = Query(
        default=None, description="Full mathematical expression to evaluate"
    ),
) -> CalculationResponse:
    if expr is not None:
        result = evaluate_expression(expr)
        return CalculationResponse(expression=expr, result=result)

    if operator is None or num1 is None or num2 is None:
        raise HTTPException(
            status_code=400,
            detail="Either 'expr' or ('operator', 'num1', 'num2') must be provided",
        )

    result = compute_legacy(operator, num1, num2)
    expr_repr = f"{num1} {operator} {num2}"
    return CalculationResponse(expression=expr_repr, result=result)
