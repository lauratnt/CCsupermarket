document.addEventListener('DOMContentLoaded', function () {
  const accountModal = document.getElementById('accountModal');
  const accountLink = document.getElementById('accountLink');
  const closeModalButton = document.querySelector('.close');

  accountLink.addEventListener('click', function (event) {
      event.preventDefault();
      openModal();
  });

  closeModalButton.addEventListener('click', closeModal);

  function openModal() {
      accountModal.style.display = 'block';
  }

  function closeModal() {
      accountModal.style.display = 'none';
  }

  window.onclick = function (event) {
      if (event.target === accountModal) {
          closeModal();
      }
  };
});
