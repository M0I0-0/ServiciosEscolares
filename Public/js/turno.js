// ===============================
// URL Params
// ===============================
const params = new URLSearchParams(window.location.search);
const tipo = (params.get("tipo") || "").trim();
const folioUrl = (params.get("folio") || "").trim();

// ===============================
// Back URL según tipo/origen
// ===============================
const isInscripcion = tipo.toLowerCase().includes("inscrip");
const backUrl = isInscripcion ? "/bienvenidos_inscripcion" : "/form_tramites";

// ===============================
// DOM
// ===============================
const $contador = document.getElementById("contador");
const $turno = document.getElementById("turno-actual");
const $p1 = document.getElementById("proximo-1");
const $p2 = document.getElementById("proximo-2");
const $btn = document.getElementById("btn-cancelar");

const $titulo = document.getElementById("titulo");
const $lista = document.getElementById("lista-documentos");

// ===============================
// STATE
// ===============================
let pollingEstado = null;
let countdownInterval = null;
let restanteLocal = null;
let estadoActual = null;
let modoContador = null;

// folio persistente
let folio = folioUrl || localStorage.getItem("folio_turno_actual") || "";

// ===============================
// Utils
// ===============================
function fmt(seg) {
  const total = Math.max(0, Number(seg || 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setText(el, text) {
  if (el) el.textContent = text;
}

function stopCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = null;
  restanteLocal = null;
  modoContador = null;
}

function stopPolling() {
  if (pollingEstado) clearInterval(pollingEstado);
  pollingEstado = null;
}

function guardarFolioLocal(valor) {
  if (valor) {
    localStorage.setItem("folio_turno_actual", valor);
  } else {
    localStorage.removeItem("folio_turno_actual");
  }
}

function pintarProximos(arr = []) {
  setText($p1, arr?.[0] || "—");
  setText($p2, arr?.[1] || "—");
}

function setButtonMode(mode) {
  if (!$btn) return;

  if (mode === "back") {
    $btn.textContent = "Volver a selección de trámite";
    $btn.onclick = () => {
      guardarFolioLocal("");
      window.location.href = backUrl;
    };
    return;
  }

  $btn.textContent = "Cancelar";
  $btn.onclick = cancelarTurno;
}

function iniciarPolling() {
  if (pollingEstado) return;

  pollingEstado = setInterval(async () => {
    try {
      await fetch("/turnos/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Error en tick:", e);
    }

    await refrescarEstado();
  }, 5000);
}

// ===============================
// DOCUMENTOS SEGÚN TRÁMITE
// ===============================
function cargarDocs() {
  if (!$titulo || !$lista) return;

  if (!tipo) {
    $titulo.textContent = "Documentación necesaria";
    $lista.innerHTML = "";
    const li = document.createElement("li");
    li.textContent = "Selecciona un trámite para ver los documentos.";
    $lista.appendChild(li);
    return;
  }

  fetch("/docs/requisitos.json")
    .then((res) => res.json())
    .then((data) => {
      const tramite = data[tipo];

      if (!tramite) {
        $titulo.textContent = "Documentación necesaria";
        $lista.innerHTML = "";
        const li = document.createElement("li");
        li.textContent = "Trámite no encontrado en requisitos.json";
        $lista.appendChild(li);
        return;
      }

      $titulo.textContent = tramite.titulo || "Documentación necesaria";
      $lista.innerHTML = "";

      (tramite.documentos || []).forEach((doc) => {
        const li = document.createElement("li");
        li.textContent = doc;
        $lista.appendChild(li);
      });
    })
    .catch(() => {
      $titulo.textContent = "Documentación necesaria";
      $lista.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = "No se pudo cargar requisitos.json";
      $lista.appendChild(li);
    });
}

// ===============================
// CONTADORES
// ===============================
function iniciarCountdown(segundos, modo) {
  const nuevoRestante = Math.max(0, Number(segundos || 0));

  if (countdownInterval && modoContador === modo) {
    restanteLocal = nuevoRestante;
    setText($contador, fmt(restanteLocal));
    return;
  }

  stopCountdown();
  restanteLocal = nuevoRestante;
  modoContador = modo;
  setText($contador, fmt(restanteLocal));

  countdownInterval = setInterval(() => {
    restanteLocal = Math.max(0, (restanteLocal ?? 0) - 1);
    setText($contador, fmt(restanteLocal));
  }, 1000);
}

// ===============================
// VISTAS FINALES
// ===============================
function mostrarCancelado() {
  stopCountdown();
  setText($contador, "CANCELADO");
  setText($turno, folio || "—");
  pintarProximos([]);
  setButtonMode("back");
  guardarFolioLocal("");
}

function mostrarNoPresentado() {
  stopCountdown();
  setText($contador, "NO PRESENTADO");
  setText($turno, folio || "—");
  pintarProximos([]);
  setButtonMode("back");
  guardarFolioLocal("");
}

function mostrarFinalizado() {
  stopCountdown();
  setText($contador, "ATENDIDO");
  setText($turno, folio || "—");
  pintarProximos([]);
  setButtonMode("back");
  guardarFolioLocal("");
}

// ===============================
// CANCELAR TURNO
// ===============================
async function cancelarTurno() {
  if (!folio) return;

  try {
    const r = await fetch("/turnos/cancelar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ folio }),
    });

    const data = await r.json();

    if (data?.ok) {
      mostrarCancelado();
    } else {
      setText($contador, "ERROR");
    }
  } catch (e) {
    console.error("Error cancelando turno:", e);
    setText($contador, "ERROR");
  }
}

// ===============================
// ESTADO DESDE BACKEND
// ===============================
async function refrescarEstado() {
  if (!$turno || !$contador) return;

  if (!folio) {
    setText($turno, "—");
    setText($contador, "—");
    pintarProximos([]);
    setButtonMode("back");
    return;
  }

  guardarFolioLocal(folio);
  setText($turno, folio);

  try {
    const res = await fetch(
      `/turnos/estado?folio=${encodeURIComponent(folio)}`,
    );
    const data = await res.json();

    if (!data?.ok || !data.miTurno) {
      setText($contador, "—");
      pintarProximos([]);
      setButtonMode("back");
      return;
    }

    const miTurno = data.miTurno;
    estadoActual = miTurno.estado;

    pintarProximos(data.proximos_adelante || []);

    if (miTurno.estado === "CANCELADO") {
      mostrarCancelado();
      return;
    }

    if (miTurno.estado === "NO_PRESENTADO") {
      mostrarNoPresentado();
      return;
    }

    if (miTurno.estado === "FINALIZADO") {
      mostrarFinalizado();
      return;
    }

    setButtonMode("cancel");

    if (miTurno.estado === "LLAMADO") {
      const restante =
        typeof data.restanteSeg === "number" ? data.restanteSeg : 0;

      iniciarCountdown(restante, "LLAMADO");
      return;
    }

    if (miTurno.estado === "EN_ATENCION") {
      stopCountdown();
      const ventanillaTexto = miTurno.ventanilla
        ? `PASA A VENTANILLA ${miTurno.ventanilla}`
        : "PASA A VENTANILLA";

      setText($contador, ventanillaTexto);
      return;
    }

    if (miTurno.estado === "EN_ESPERA") {
      const estimado =
        typeof data.estimadoSeg === "number" ? data.estimadoSeg : 0;

      iniciarCountdown(estimado, "EN_ESPERA");
      return;
    }

    stopCountdown();
    setText($contador, "—");
  } catch (e) {
    console.error("Error refrescando estado:", e);
    setText($contador, "—");
  }
}

// ===============================
// INIT
// ===============================
window.addEventListener("DOMContentLoaded", async () => {
  cargarDocs();
  setButtonMode("cancel");
  await refrescarEstado();
  iniciarPolling();
});
