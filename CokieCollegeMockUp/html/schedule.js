function showDay(dayId, element) {
        // 1. Quitar clase active de todos los contenidos
        const contents = document.querySelectorAll('.day-content');
        contents.forEach(content => content.classList.remove('active'));

        // 2. Quitar clase active de todos los botones
        const buttons = document.querySelectorAll('.day-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        // 3. Activar el seleccionado
        document.getElementById(dayId).classList.add('active');
        element.classList.add('active');

        // 4. Actualizar texto de cabecera
        document.getElementById('current-day-label').innerText = "Horario de " + dayId.toUpperCase();
    }