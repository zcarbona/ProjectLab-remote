from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/calculate")
async def calculator(sbol: str, num1: int, num2: int) -> float:
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