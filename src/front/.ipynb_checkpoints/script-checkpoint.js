async function calculate() {
    const num1 = document.getElementById("num1").value;
    const num2 = document.getElementById("num2").value;
    const operator = document.getElementById("operator").value;

    try {
        const response = await fetch(
            `http://127.0.0.1:8000/calculate?sbol=${encodeURIComponent(operator)}&num1=${num1}&num2=${num2}`,
            {
                method: "POST"
            }
        );

        console.log("Status:", response.status);

        const text = await response.text();
        console.log("Response:", text);

        document.getElementById("output").textContent = text;

    } catch (err) {
        console.error(err);
        document.getElementById("output").textContent = err.message;
    }
}