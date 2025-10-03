// Sample product data
const products = [
  { id: 1, name: "Smartphone", category: "electronics", price: "$299", img: "https://via.placeholder.com/200x150?text=Smartphone" },
  { id: 2, name: "Laptop", category: "electronics", price: "$899", img: "https://via.placeholder.com/200x150?text=Laptop" },
  { id: 3, name: "Headphones", category: "electronics", price: "$49", img: "https://via.placeholder.com/200x150?text=Headphones" },
  { id: 4, name: "T-Shirt", category: "clothing", price: "$19", img: "https://via.placeholder.com/200x150?text=T-Shirt" },
  { id: 5, name: "Jeans", category: "clothing", price: "$39", img: "https://via.placeholder.com/200x150?text=Jeans" },
  { id: 6, name: "Jacket", category: "clothing", price: "$79", img: "https://via.placeholder.com/200x150?text=Jacket" }
];

// DOM elements
const filterSelect = document.getElementById("filter");
const productsContainer = document.getElementById("products-container");

// Function to render products
function renderProducts(category) {
  productsContainer.innerHTML = "";

  let filteredProducts = category === "all" ? products : products.filter(p => p.category === category);

  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = "<p>No products available.</p>";
    return;
  }

  filteredProducts.forEach(product => {
    const productCard = document.createElement("div");
    productCard.classList.add("product-card");

    productCard.innerHTML = `
      <img src="${product.img}" alt="${product.name}">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-price">${product.price}</p>
    `;

    productsContainer.appendChild(productCard);
  });
}

// Event listener for filter
filterSelect.addEventListener("change", () => {
  renderProducts(filterSelect.value);
});

// Initial render
renderProducts("all");
