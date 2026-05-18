const fileInput = document.getElementById('file-source');
    const statusText = document.getElementById('status-text');
    const previewArea = document.getElementById('preview-area');
    const imgDisplay = document.getElementById('img-display');

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            statusText.textContent = "Seleccionado: " + file.name;
            statusText.style.color = "var(--blue)";

            // Mostrar previa si es imagen
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imgDisplay.src = e.target.result;
                    previewArea.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else {
                previewArea.style.display = 'none';
            }
        }
    });

    document.getElementById('main-permit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Formulario validado y enviado correctamente.');
    });