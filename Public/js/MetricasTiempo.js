async function cargarMetricasTiempo(){

const res = await fetch("/api/metricas/tiempos-promedio");
const data = await res.json();

const personal = data.map(d => "Ventanilla " + d.ventanilla);

const tiempos = data.map(d => Math.round(d.tiempo_promedio / 60)); // minutos

const ctx = document.getElementById("graficaTiempo");

new Chart(ctx, {
type: "bar",
data: {
labels: personal,
datasets: [{
label: "Tiempo promedio (min)",
data: tiempos,
backgroundColor: "#f59e0b",
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

cargarMetricasTiempo();