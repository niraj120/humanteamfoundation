// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Handle contact form submit (front-end only for now)
function handleSubmit(event) {
  event.preventDefault();
  const status = document.getElementById("form-status");
  status.textContent = "Thanks! Your message has been received.";
  event.target.reset();
  return false;
}
