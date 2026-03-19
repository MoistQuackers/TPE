const loginForm = document.getElementById("loginForm");
const messageEl = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  messageEl.textContent = "Signing in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch("/.netlify/functions/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      messageEl.textContent = data.error || "Login failed";
      return;
    }

    localStorage.setItem("portalUser", JSON.stringify(data.user));
    window.location.href = "/dashboard.html";
  } catch (error) {
    console.error(error);
    messageEl.textContent = "Something went wrong";
  }
});
