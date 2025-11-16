const toggleBtn = document.getElementById("theme-toggle");

document.addEventListener("DOMContentLoaded", () => {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
  }
});

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", currentTheme);
});
