// register.js stessa cosa ma per gli user


function registerUser() {
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  
  axios.post('http://localhost:4000/users/register', {
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


