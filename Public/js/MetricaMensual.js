async function cargarMetricas(){

const res = await fetch("/api/metricas/mensuales");
const data = await res.json();

const nombresMeses = [
"Enero","Febrero","Marzo","Abril","Mayo","Junio",
"Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const meses = data.map(d => nombresMeses[parseInt(d.mes) - 1]);
const totales = data.map(d => d.total);

const ctx = document.getElementById("graficaMes");

new Chart(ctx, {
type: "bar",
data: {
labels: meses,
datasets: [{
label: "Turnos por mes",
data: totales,
backgroundColor: "#3b82f6",
borderRadius: 8
}]
},
options: {
scales: {
y: {
beginAtZero: true,
ticks: {
precision: 0
}
}
}
}
});

}

cargarMetricas();