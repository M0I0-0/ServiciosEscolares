document.querySelector(".btn").addEventListener("click", async () => {

  const correo = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, password })
  });

  const data = await res.json();

  if (data.ok) {
    alert("Login correcto");
    window.location.href = "/bienvenida";
  } else {
    alert(data.error);
  }

});