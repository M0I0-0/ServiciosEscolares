async function cargarPersonal() {

  const response = await fetch("/api/personal");
  const personal = await response.json();

  const tableBody = document.querySelector(".table-body");

  tableBody.innerHTML = "";

  personal.forEach(p => {

    const row = `
      <div class="row">
        <div>${p.correo}</div>
        <div>Personal</div>
      </div>
    `;

    tableBody.innerHTML += row;

  });

}

cargarPersonal();