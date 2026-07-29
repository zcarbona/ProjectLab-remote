from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import ast
import operator as op
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported operators for safe AST evaluation
operators = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.USub: op.neg
}

def safe_eval(node):
    if isinstance(node, ast.Num):  # Python < 3.8
        return node.n
    elif isinstance(node, ast.Constant):  # Python 3.8+
        return node.value
    elif isinstance(node, ast.BinOp):
        left = safe_eval(node.left)
        right = safe_eval(node.right)
        op_type = type(node.op)
        if op_type == ast.Div and right == 0:
            raise ZeroDivisionError()
        return operators[op_type](left, right)
    elif isinstance(node, ast.UnaryOp):
        return operators[type(node.op)](safe_eval(node.operand))
    else:
        raise TypeError("Unsupported operation")

def evaluate_expression(expr_str: str) -> float:
    # Normalize common symbols to standard Python operators
    cleaned = expr_str.replace('×', '*').replace('÷', '/').replace('−', '-')
    # Remove any whitespaces
    cleaned = "".join(cleaned.split())
    try:
        node = ast.parse(cleaned, mode='eval')
        return float(safe_eval(node.body))
    except ZeroDivisionError:
        raise HTTPException(status_code=400, detail="Cannot divide by zero")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid expression")

@app.get("/")
async def root():
    return {"message": "Hello World", "status": "online"}


@app.post("/calculate")
async def calculator(
    sbol: Optional[str] = None,
    num1: Optional[float] = None,
    num2: Optional[float] = None,
    expr: Optional[str] = None
) -> float:
    # If a full continuous expression is provided, evaluate it safely
    if expr is not None:
        return evaluate_expression(expr)

    # Otherwise, fall back to traditional 2-number evaluation (backward compatibility)
    if sbol is None or num1 is None or num2 is None:
        raise HTTPException(
            status_code=400,
            detail="Missing calculation parameters"
        )

    match sbol:
        case "*":
            return num1 * num2

        case "+":
            return num1 + num2

        case "-":
            return num1 - num2

        case "/":
            if num2 == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot divide by zero"
                )
            return num1 / num2

        case _:
            raise HTTPException(
                status_code=400,
                detail="Invalid operator"
            )

@app.post("/asldkj")
async def haha()-> str:
    return "a7a neek"