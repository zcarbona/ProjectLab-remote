const API = "http://127.0.0.1:8000";

document.getElementById("calculate").addEventListener("click", calculate);

async function calculate() {
    const num1 = document.getElementById("num1").value;
    const num2 = document.getElementById("num2").value;
    const operator = document.getElementById("operator").value;

    if (num1 === "" || num2 === "") {
        alert("Please enter both numbers.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/calculate?sbol=${encodeURIComponent(operator)}&num1=${num1}&num2=${num2}`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            document.getElementById("output").textContent = data.detail;
            return;
        }

        document.getElementById("output").textContent = data;
    } catch (err) {
        document.getElementById("output").textContent = "Cannot connect to API";
    }
}