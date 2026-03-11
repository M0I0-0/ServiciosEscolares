async function cargarMetricasPersonal(){

const res = await fetch("/api/metricas/por-personal");
const data = await res.json();

const personal = data.map(d => "Ventanilla " + d.ventanilla);
const totales = data.map(d => d.total);

const ctx = document.getElementById("graficaPersonal");

new Chart(ctx, {
type: "bar",
data: {
labels: personal,
datasets: [{
label: "Turnos atendidos",
data: totales,
backgroundColor: "#22c55e",
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

cargarMetricasPersonal();