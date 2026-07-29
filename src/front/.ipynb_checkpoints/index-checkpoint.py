<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FastAPI Calculator</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="container">
    <h1>Calculator</h1>

    <div class="input-group">
        <input type="number" id="num1" placeholder="First Number">
    </div>

    <div class="input-group">
        <select id="operator">
            <option value="+">+</option>
            <option value="-">−</option>
            <option value="*">×</option>
            <option value="/">÷</option>
        </select>
    </div>

    <div class="input-group">
        <input type="number" id="num2" placeholder="Second Number">
    </div>

    <button id="calculate">Calculate</button>

    <div id="result">
        Result:
        <span id="output">0</span>
    </div>
</div>

<script src="script.js"></script>
</body>
</html>