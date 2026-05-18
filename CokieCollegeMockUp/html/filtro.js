function toggleFilter() {
    const panel = document.getElementById('filterPanel');
    const overlay = document.getElementById('overlay');
    
    // Alternamos la clase active
    panel.classList.toggle('active');
    overlay.classList.toggle('active');

    // Bloqueamos el scroll del fondo para que no se mueva mientras filtramos
    if (panel.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

// Función para seleccionar las burbujas (chips)
function selectChip(element) {
    element.classList.toggle('selected');
}

// OPCIONAL: Cerrar también si presionan la tecla Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const panel = document.getElementById('filterPanel');
        if (panel.classList.contains('active')) {
            toggleFilter();
        }
    }
});