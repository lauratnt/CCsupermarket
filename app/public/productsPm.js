
const username = JSON.parse(localStorage.getItem('username'));

const cartCount = JSON.parse(localStorage.getItem('cart'))?.length || 0;

const cartIcon = document.createElement('div');


cartIcon.addEventListener('click', () => {
  
  window.location.href = '/carrello';
});


document.body.appendChild(cartIcon);


function insertProducts(products, username) {
  const productsContainer = document.getElementById('productsContainer');

  
  products.forEach(product => {
    const card = document.createElement('div');
    card.classList.add('product-card');

    const image = document.createElement('img');

    const name = document.createElement('h3');
    name.textContent = product.name;

    const productId = document.createElement('p');
    productId.textContent = `ID: ${product.id}`;

    const price = document.createElement('p');
    price.textContent = `Prezzo: ${product.price}`;

    const addToCartButton = document.createElement('button');
    addToCartButton.textContent = '';

    const supermarketNameElement = document.createElement('p');
    supermarketNameElement.textContent = `Nome Supermercato: ${product.supermarket_name}`;

    addToCartButton.addEventListener('click', () => {
      let cart = JSON.parse(localStorage.getItem('cart')) || [];

      const existingProduct = cart.find(item => item.id === product.id);

      if (existingProduct) {
        
        existingProduct.quantity += 1;
      } else {
       
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        });
      }

      localStorage.setItem('cart', JSON.stringify(cart));

      
      const updatedCartCount = cart.reduce((total, item) => total + item.quantity, 0);
      const cartCountSpan = document.querySelector('.fa-shopping-cart + span');
      cartCountSpan.textContent = updatedCartCount;

      
      console.log(`Prodotto aggiunto al carrello: ${product.name}`);
    });

    
    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(productId);
    card.appendChild(price);
    card.appendChild(supermarketNameElement); 
    //card.appendChild(addToCartButton);

    
    productsContainer.appendChild(card);
  });
}


fetch('/get-products')
  .then(response => response.json())
  .then(data => insertProducts(data, username)) 
  .catch(error => console.error('Error fetching products:', error));
