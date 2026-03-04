// Lee el trámite desde la URL: /panel_personal?tramite=certificados
const params = new URLSearchParams(window.location.search);
const tramite = (params.get("tramite") || "certificados").trim();

const $usuario = document.getElementById("usuario-turno");
const $t1 = document.getElementById("t1");
const $t2 = document.getElementById("t2");
const $t3 = document.getElementById("t3");

const $aceptar = document.getElementById("btn-aceptar");
const $rechazar = document.getElementById("btn-rechazar");
const $espera = document.getElementById("btn-espera");

const setText = (el, txt) => {
  if (!el) return;
  el.textContent = txt || "—";
};

const turnLabel = (t) => {
  if (!t) return "—";
  // Folio + correo (si existe)
  return `${t.folio}${t.correo ? " - " + t.correo : ""}`;
};

async function cargarCola() {
  try {
    const res = await fetch(
      `/turnos/personal/cola?tramite=${encodeURIComponent(tramite)}`,
    );
    const data = await res.json();

    if (!data.ok) {
      setText($usuario, "Error cargando cola");
      setText($t1, "—");
      setText($t2, "—");
      setText($t3, "—");
      return;
    }

    // Turno actual
    if (data.actual) {
      setText($usuario, `En turno: ${turnLabel(data.actual)}`);
    } else {
      setText($usuario, "En turno: —");
    }

    // Próximos 3
    const p = data.proximos || [];
    setText($t1, p[0] ? turnLabel(p[0]) : "—");
    setText($t2, p[1] ? turnLabel(p[1]) : "—");
    setText($t3, p[2] ? turnLabel(p[2]) : "—");
  } catch (e) {
    setText($usuario, "Error de conexión");
    setText($t1, "—");
    setText($t2, "—");
    setText($t3, "—");
  }
}

async function accion(accion) {
  try {
    await fetch("/turnos/personal/accion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tramite, accion }),
    });

    // refrescar después de la acción
    await cargarCola();
  } catch (e) {
    // no rompemos la UI
  }
}

// Botones
$aceptar?.addEventListener("click", (e) => {
  e.preventDefault();
  accion("aceptar");
});

$rechazar?.addEventListener("click", (e) => {
  e.preventDefault();
  accion("rechazar");
});

$espera?.addEventListener("click", (e) => {
  e.preventDefault();
  accion("espera");
});

// Init + refresco automático
cargarCola();
setInterval(cargarCola, 5000);
