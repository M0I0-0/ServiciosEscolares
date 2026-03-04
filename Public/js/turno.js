// ===============================
// URL Params
// ===============================
const params = new URLSearchParams(window.location.search);
const tipo = (params.get("tipo") || "").trim();
const folio = (params.get("folio") || "").trim();

// ===============================
// Back URL según tipo/origen
// ===============================
// Si el "tipo" contiene "inscrip" => volver a bienvenidos_inscripcion
// En caso contrario => volver a form_tramites
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
// UI helpers
// ===============================
const pintarProximos = (arr) => {
  setText($p1, arr?.[0] || "—");
  setText($p2, arr?.[1] || "—");
};

// Botón en 2 modos
const setButtonMode = (mode) => {
  if (!$btn) return;

  if (mode === "back") {
    $btn.textContent = "Volver a selección de trámite";
    $btn.onclick = () => (window.location.href = backUrl);
    return;
  }

  // mode === "cancel"
  $btn.textContent = "Cancelar";
  $btn.onclick = cancelarTurno;
};

// UI bonita de cancelado
const mostrarCancelado = () => {
  stopTimers();
  setText($contador, "CANCELADO");
  setText($turno, folio || "—");
  pintarProximos([]);
  setButtonMode("back");
};

// ===============================
// DOCUMENTOS (tu parte original)
// ===============================
const cargarDocs = () => {
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
// Cancelar (normal)
// ===============================
async function cancelarTurno() {
  if (!folio) return;

  try {
    const r = await fetch("/turnos/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folio }),
    });
    const data = await r.json();

    if (data && data.ok) {
      mostrarCancelado();
    } else {
      // si algo falla, mínimo avisamos en contador
      setText($contador, "ERROR");
    }
  } catch (e) {
    setText($contador, "ERROR");
  }
}

// ===============================
// Estado del turno desde backend
// ===============================
const refrescarEstado = async () => {
  if (!$turno || !$contador) return;

  if (!folio) {
    setText($turno, "—");
    setText($contador, "—");
    pintarProximos([]);
    setButtonMode("back"); // sin folio, vuelve
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
      setButtonMode("back");
      return;
    }

    // Próximos ADELANTE (antes que tú)
    pintarProximos(data.proximos_adelante || []);

    // Si cancelado
    if (data.miTurno.estado === "CANCELADO") {
      mostrarCancelado();
      return;
    }

    // Si es tu turno (3:00 real)
    if (data.miTurno.estado === "EN_ATENCION") {
      setButtonMode("cancel"); // puede cancelar durante atención también

      const restante =
        typeof data.restanteSeg === "number" ? data.restanteSeg : 180;

      if (countdownInterval) return;

      let seg = restante;
      setText($contador, fmt(seg));

      countdownInterval = setInterval(async () => {
        seg = Math.max(0, seg - 1);
        setText($contador, fmt(seg));

        if (seg === 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;

          // al llegar a 0: cancelar + pasar al siguiente
          await fetch("/turnos/tick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tramite: data.miTurno.tramite }),
          });

          mostrarCancelado();
          setTimeout(refrescarEstado, 1000);
        }
      }, 1000);

      return;
    }

    // EN_ESPERA: estimado (15 min por turno delante)
    setButtonMode("cancel");
    const estimado =
      typeof data.estimadoSeg === "number" ? data.estimadoSeg : 0;
    setText($contador, fmt(estimado));

    if (!refreshInterval) {
      refreshInterval = setInterval(refrescarEstado, 10000);
    }
  } catch (e) {
    setText($contador, "—");
  }
};

// ===============================
// Init
// ===============================
cargarDocs();
setButtonMode("cancel"); // modo inicial por si todo va bien
refrescarEstado();