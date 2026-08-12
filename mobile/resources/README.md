# Reto: Fecha de Nacimiento, Validación de Edad y Pill de Edad

En esta carpeta `mobile/RetoFecha` se encuentran todos los archivos completos necesarios para resolver el reto.

---

## 📁 Archivos Incluidos

1. **`01_migration.sql`**
   - Script SQL para ejecutar en el SQL Editor de Supabase.
   - Agrega la columna `birth_date DATE` a la tabla `profiles`.

2. **`users.jsx`**
   - Pantalla completa de administración de usuarios en React Native (`mobile/app/users.jsx`).
   - Incluye:
     - Componente `DateTimePicker` para la selección de la fecha de nacimiento.
     - Estado `birth_date` en `formData`.
     - Función de cálculo exacto de edad teniendo en cuenta año, mes y día actual.
     - Validación de edad por rol:
       - **Alumnos (`student`)**: Rango permitido de 7 a 16 años.
       - **Admins, Coordinadores y Docentes (`super_admin`, `coordinator`, `teacher`)**: Mayor o igual a 18 años.
     - Envío del campo `birth_date` al backend tanto en creación como en actualización.

3. **`adminController.js`**
   - Controlador del backend (`backend/src/controllers/adminController.js`).
   - Modificado para recibir `birth_date` en la petición e insertarlo en la tabla `profiles` de Supabase.

4. **`home.jsx`**
   - Pantalla principal (`mobile/app/home.jsx`).
   - Calcula la edad a partir de `profile.birth_date` (obtenido automáticamente de Supabase vía `AuthContext`).
   - Muestra una **pill azul** con la edad junto a las pills de Rol y Nivel Académico.

---

## 🚀 Instrucciones de Aplicación

Si en el futuro deseas aplicar estos cambios al proyecto real:

1. **Base de Datos:** Ejecuta el contenido de `01_migration.sql` en Supabase.
2. **Backend:** Reemplaza o integra los cambios de `adminController.js` en `backend/src/controllers/adminController.js`.
3. **Mobile:** 
   - Reemplaza `mobile/app/users.jsx` por el archivo `users.jsx`.
   - Reemplaza `mobile/app/home.jsx` por el archivo `home.jsx`.
