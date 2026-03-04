// obtener parametro de la URL
const params = new URLSearchParams(window.location.search);
const tipo = params.get("tipo");

// cargar JSON
fetch("/docs/requisitos.json")
  .then(res => res.json())
  .then(data => {

    const tramite = data[tipo];

    if (!tramite) {
      document.body.innerHTML = "Trámite no encontrado";
      return;
    }

    document.getElementById("titulo").textContent = tramite.titulo;

    const lista = document.getElementById("lista-documentos");

    tramite.documentos.forEach(doc => {
      const li = document.createElement("li");
      li.textContent = doc;
      lista.appendChild(li);
    });

  });