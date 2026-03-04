// ===============================
// URL Params
// ===============================
const params = new URLSearchParams(window.location.search);
const tipo = (params.get("tipo") || "").trim();
const folio = (params.get("folio") || "").trim();

// ===============================
// DOM
// ===============================
const $contador = document.getElementById("contador");
const $turno = document.getElementById("turno-actual");
const $p1 = document.getElementById("proximo-1");
const $p2 = document.getElementById("proximo-2");
const $btnCancelar = document.getElementById("btn-cancelar");

const $titulo = document.getElementById("titulo");
const $lista = document.getElementById("lista-documentos");

// ===============================
// Utils
// ===============================
const fmt = (seg) => {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const setText = (el, text) => {
  if (el) el.textContent = text;
};

// ===============================
// Timers
// ===============================
let refreshInterval = null;
let countdownInterval = null;

const stopTimers = () => {
  if (refreshInterval) clearInterval(refreshInterval);
  if (countdownInterval) clearInterval(countdownInterval);
  refreshInterval = null;
  countdownInterval = null;
};

// ===============================
// DOCUMENTOS (tu parte original)
// ===============================
const cargarDocs = () => {
  // Si no hay tipo, no hay docs
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

      $titulo.textContent = tramite.titulo;
      $lista.innerHTML = "";

      tramite.documentos.forEach((doc) => {
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
};

// ===============================
// UI: próximos turnos ADELANTE
// ===============================
const pintarProximos = (arr) => {
  setText($p1, arr?.[0] || "—");
  setText($p2, arr?.[1] || "—");
};

// ===============================
// Estado del turno desde backend
// ===============================
const refrescarEstado = async () => {
  if (!$turno || !$contador) return;

  if (!folio) {
    setText($turno, "—");
    setText($contador, "—");
    pintarProximos([]);
    return;
  }

  setText($turno, folio);

  try {
    const res = await fetch(
      `/turnos/estado?folio=${encodeURIComponent(folio)}`,
    );
    const data = await res.json();

    if (!data.ok) {
      setText($contador, "—");
      pintarProximos([]);
      return;
    }

    // Próximos ADELANTE (antes que tú)
    pintarProximos(data.proximos_adelante || []);

    // Si ya cancelado
    if (data.miTurno.estado === "CANCELADO") {
      stopTimers();
      setText($contador, "CANCELADO");
      setText($turno, `${folio} (CANCELADO)`);
      return;
    }

    // Si ya es tu turno: contador real 3:00
    if (data.miTurno.estado === "EN_ATENCION") {
      const restante =
        typeof data.restanteSeg === "number" ? data.restanteSeg : 180;

      // Si ya está corriendo, no lo reinicies
      if (countdownInterval) return;

      let seg = restante;
      setText($contador, fmt(seg));

      countdownInterval = setInterval(async () => {
        seg = Math.max(0, seg - 1);
        setText($contador, fmt(seg));

        if (seg === 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;

          // Al llegar a 0: CANCELADO + pasa al siguiente
          await fetch("/turnos/tick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tramite: data.miTurno.tramite }),
          });

          setText($contador, "CANCELADO");
          setText($turno, `${folio} (CANCELADO)`);

          // Reconsulta para recalcular todo (por si cambia algo en cola)
          setTimeout(refrescarEstado, 1000);
        }
      }, 1000);

      return;
    }

    // Si está en espera: mostrar estimado (15 min por turno delante, backend ya lo manda)
    const estimado =
      typeof data.estimadoSeg === "number" ? data.estimadoSeg : 0;
    setText($contador, fmt(estimado));

    // refresco cada 10s para actualizar estimado y próximos
    if (!refreshInterval) {
      refreshInterval = setInterval(refrescarEstado, 10000);
    }
  } catch (e) {
    setText($contador, "—");
  }
};

// ===============================
// Botón Cancelar
// ===============================
$btnCancelar?.addEventListener("click", async () => {
  if (!folio) return;

  try {
    await fetch("/turnos/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folio }),
    });

    stopTimers();
    setText($contador, "CANCELADO");
    setText($turno, `${folio} (CANCELADO)`);
  } catch (e) {
    // si falla, no rompemos UI
  }
});

// ===============================
// Init
// ===============================
cargarDocs();
refrescarEstado();
