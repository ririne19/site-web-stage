// Favicon
document.head.insertAdjacentHTML('beforeend', `
  <link rel="icon" type="image/svg+xml" href="../Divers/favicon.png">
`);

// Header CSS
document.head.insertAdjacentHTML('beforeend', `
  <link rel="stylesheet" href="../Styles/header.css">
`);

// Header
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('header.header');
  if (header) {
    header.innerHTML = `
      <div class="header-top">
        <div class="logo"><a href="../Pages/index.html"><img src="../Divers/logoIAVelay.svg" alt="Logo"></a></div>
        <div class="search-bar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Entrez votre recherche...">
        </div>
        <div class="language-selector">
          <select aria-label="Choisir la langue">
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>
      </div>
      <div class="header-bottom">
        <nav class="nav">
          <ul>
            <li><a href="#">Text <span class="dropdown-arrow">▼</span></a></li>
            <li><a href="#">Text <span class="dropdown-arrow">▼</span></a></li>
            <li><a href="#">Text <span class="dropdown-arrow">▼</span></a></li>
            <li><a href="#">Text <span class="dropdown-arrow">▼</span></a></li>
            <li><a href="#">Text <span class="dropdown-arrow">▼</span></a></li>
          </ul>
        </nav>
      </div>
    `;
  }
});