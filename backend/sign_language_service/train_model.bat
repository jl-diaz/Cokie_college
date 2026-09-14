@echo off
title Cokie College - Entrenador Local de Red Neuronal IA
echo ================================================================
echo    COKIE COLLEGE - ENTRENAMIENTO DE RED NEURONAL IA
echo ================================================================
echo.
echo Leyendo muestras grabadas en data/samples y entrenando red neuronal...
echo.

python gesture_trainer.py

echo.
echo Presiona cualquier tecla para salir...
pause >nul
