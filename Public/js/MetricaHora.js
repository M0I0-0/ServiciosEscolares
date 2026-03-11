async function cargarHorasPico(){

const res = await fetch("/api/metricas/horas-pico");
const data = await res.json();

const horas = data.map(d => d.hora + ":00");
const totales = data.map(d => d.total);

const ctx = document.getElementById("graficaHoras");

new Chart(ctx, {
type: "line",
data: {
labels: horas,
datasets: [{
label: "Turnos por hora",
data: totales,
borderColor: "#ef4444",
backgroundColor: "#ef4444",
tension: 0.3
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

cargarHorasPico();