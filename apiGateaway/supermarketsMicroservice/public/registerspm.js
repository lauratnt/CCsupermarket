// registerspm.js per i supermercati


function registerSpm() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    axios.post('http://localhost:4000/supermarkets/register-supermarket', {
      username: username,
      password: password
    })
    .then(response => {
      console.log(response.data);
  
      if (response.status === 200 && response.data.redirectUrl) {
        window.location.href = response.data.redirectUrl;
      }
    })
    .catch(error => {
      console.error(error);  
    });
  }
  

  