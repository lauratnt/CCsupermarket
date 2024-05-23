document.addEventListener("DOMContentLoaded", function () {
  const openModalButton = document.getElementById("openModalButton");
  const modal = document.getElementById("myModal");

  openModalButton.addEventListener("click", function () {
    modal.style.display = "block";
    modal.classList.add("small-modal"); 
  });

  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });

  const closeIcon = document.createElement("span");
  closeIcon.innerHTML = "&times;";
  closeIcon.classList.add("close-icon");
  modal.appendChild(closeIcon);

  closeIcon.addEventListener("click", closeModal);

  function closeModal() {
    modal.style.display = "none";
    modal.classList.remove("small-modal"); 
  }
});
