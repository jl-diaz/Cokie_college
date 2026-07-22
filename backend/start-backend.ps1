# Matar cualquier proceso usando el puerto 5000
Write-Host "Buscando procesos usando el puerto 5000..."
$port = 5000
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    Write-Host "Encontrados procesos usando el puerto $port : $processes"
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "Proceso $pid terminado exitosamente"
        } catch {
            Write-Host "No se pudo terminar el proceso $pid : $_"
        }
    }
} else {
    Write-Host "No hay procesos usando el puerto $port"
}

# Esperar un momento para asegurarnos de que el puerto esté libre
Start-Sleep -Seconds 1

# Iniciar el servidor
Write-Host "Iniciando el servidor backend..."
npm run dev
