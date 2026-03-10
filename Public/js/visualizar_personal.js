const params = new URLSearchParams(window.location.search);
const ventanilla = Number(params.get("ventanilla")) || 1;

// ===============================
// DOM
// ===============================
const $turnoActual = document.getElementById("turno-actual");
const $tramiteActual = document.getElementById("tramite-actual");
const $estadoActual = document.getElementById("estado-actual");
const $contador = document.getElementById("contador");
const $listaProximos = document.getElementById("lista-proximos");

const $btnAceptar = document.getElementById("btn-aceptar");
const $btnRechazar = document.getElementById("btn-rechazar");
const $btnEspera = document.getElementById("btn-espera");

// ===============================
// STATE
// ===============================
let turnoActual = null;
let restanteLocal = null;

// ===============================
// UTILS
// ===============================
function fmt(seg) {
  const s = Math.max(0, Number(seg || 0));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function estadoBonito(estado) {
  switch (estado) {
    case "EN_ESPERA":
      return "En espera";
    case "LLAMADO":
      return "Llamado";
    case "EN_ATENCION":
      return "En atención";
    case "FINALIZADO":
      return "Finalizado";
    case "CANCELADO":
      return "Cancelado";
    case "NO_PRESENTADO":
      return "No presentado";
    default:
      return estado || "--";
  }
}

function limpiarVistaActual() {
  setText($turnoActual, "--");
  setText($tramiteActual, "--");
  setText($estadoActual, "Sin turno");
  setText($contador, "--:--");
}

function pintarProximos(proximos = []) {
  if (!$listaProximos) return;

  $listaProximos.innerHTML = "";

  if (!proximos.length) {
    const li = document.createElement("li");
    li.textContent = "Sin turnos en espera";
    $listaProximos.appendChild(li);
    return;
  }

  proximos.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = `${t.folio} — ${t.tramite}`;
    $listaProximos.appendChild(li);
  });
}

function actualizarBotonAceptar() {
  if (!$btnAceptar) return;

  if (!turnoActual) {
    $btnAceptar.disabled = false;
    $btnAceptar.textContent = "Llamar";
    return;
  }

  if (turnoActual.estado === "EN_ESPERA") {
    $btnAceptar.disabled = false;
    $btnAceptar.textContent = "Llamar";
    return;
  }

  if (turnoActual.estado === "LLAMADO") {
    $btnAceptar.disabled = false;
    $btnAceptar.textContent = "Iniciar atención";
    return;
  }

  if (turnoActual.estado === "EN_ATENCION") {
    $btnAceptar.disabled = false;
    $btnAceptar.textContent = "Finalizar";
    return;
  }

  $btnAceptar.disabled = true;
  $btnAceptar.textContent = "Aceptar";
}

function actualizarBotonesSecundarios() {
  const hayTurno = !!turnoActual;

  if ($btnRechazar) {
    $btnRechazar.disabled = !hayTurno;
  }

  if ($btnEspera) {
    $btnEspera.disabled = !hayTurno;
  }
}

function pintarActual(actual) {
  turnoActual = actual || null;

  if (!turnoActual) {
    limpiarVistaActual();
    actualizarBotonAceptar();
    actualizarBotonesSecundarios();
    return;
  }

  setText($turnoActual, turnoActual.folio || "--");
  setText($tramiteActual, turnoActual.tramite || "--");
  setText($estadoActual, estadoBonito(turnoActual.estado));

  if (turnoActual.estado === "LLAMADO") {
    restanteLocal = Number(turnoActual.restanteSeg || 0);
    setText($contador, fmt(restanteLocal));
  } else {
    restanteLocal = null;
    setText($contador, "--:--");
  }

  actualizarBotonAceptar();
  actualizarBotonesSecundarios();
}

// ===============================
// API
// ===============================
async function cargarCola() {
  try {
    const res = await fetch(`/turnos/personal/cola?ventanilla=${ventanilla}`);
    const data = await res.json();

    if (!data.ok) {
      limpiarVistaActual();
      pintarProximos([]);
      return;
    }

    pintarActual(data.actual || null);
    pintarProximos(data.proximos || []);
  } catch (error) {
    console.error("Error cargando cola:", error);
  }
}

async function enviarAccion(accion) {
  try {
    const res = await fetch("/turnos/personal/accion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ventanilla,
        accion,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.error || "No se pudo realizar la acción");
      return;
    }

    await cargarCola();
  } catch (error) {
    console.error("Error enviando acción:", error);
    alert("Error de conexión");
  }
}

// ===============================
// EVENTS
// ===============================
if ($btnAceptar) {
  $btnAceptar.addEventListener("click", async () => {
    if (!turnoActual) {
      await enviarAccion("llamar");
      return;
    }

    if (turnoActual.estado === "EN_ESPERA") {
      await enviarAccion("llamar");
      return;
    }

    if (turnoActual.estado === "LLAMADO") {
      await enviarAccion("iniciar");
      return;
    }

    if (turnoActual.estado === "EN_ATENCION") {
      await enviarAccion("finalizar");
      return;
    }
  });
}

if ($btnRechazar) {
  $btnRechazar.addEventListener("click", async () => {
    if (!turnoActual) return;
    await enviarAccion("rechazar");
  });
}

if ($btnEspera) {
  $btnEspera.addEventListener("click", async () => {
    if (!turnoActual) return;
    await enviarAccion("espera");
  });
}

// ===============================
// TIMER LOCAL PARA LLAMADO
// ===============================
setInterval(() => {
  if (
    turnoActual &&
    turnoActual.estado === "LLAMADO" &&
    restanteLocal !== null
  ) {
    restanteLocal = Math.max(0, restanteLocal - 1);
    setText($contador, fmt(restanteLocal));
  }
}, 1000);

// ===============================
// REFRESH EN VIVO
// ===============================
setInterval(async () => {
  try {
    await fetch("/turnos/tick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Error en tick:", e);
  }

  await cargarCola();
}, 5000);

// ===============================
// INIT
// ===============================
window.addEventListener("DOMContentLoaded", async () => {
  const titulo = document.getElementById("titulo-ventanilla");
  if (titulo) {
    titulo.textContent = `Ventanilla ${ventanilla}`;
  }

  await cargarCola();
});
