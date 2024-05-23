//duplicato di menu

$(document).ready(function() {
    const menuItems = [
      { label: 'Chi siamo', link: '#' },
      { label: 'Cosa vendiamo', link: '#' },
      { label: 'Contatti', link: '#' },
      { label: 'Loggati', link: '/login' }
    ];
  
    const menuElement = $('#menu');
    menuItems.forEach(item => {
      const linkElement = $('<a>').attr('href', item.link).text(item.label);
      menuElement.append(linkElement);
    });
  });
  