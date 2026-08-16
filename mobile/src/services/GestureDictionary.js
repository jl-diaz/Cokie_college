import * as fp from 'fingerpose';

// Definir Gestos Personalizados

// 1. Números básicos
export const Sign0 = new fp.GestureDescription('sign.0');
export const Sign1 = new fp.GestureDescription('sign.1');
export const Sign2 = new fp.GestureDescription('sign.2');
export const Sign3 = new fp.GestureDescription('sign.3');
export const Sign4 = new fp.GestureDescription('sign.4');
export const Sign5 = new fp.GestureDescription('sign.5');
export const Sign6 = new fp.GestureDescription('sign.6');
export const Sign7 = new fp.GestureDescription('sign.7');
export const Sign8 = new fp.GestureDescription('sign.8');
export const Sign9 = new fp.GestureDescription('sign.9');
export const Sign10 = new fp.GestureDescription('sign.10');

// 2. Abecedario
export const SignA = new fp.GestureDescription('sign.a');
export const SignB = new fp.GestureDescription('sign.b');
export const SignC = new fp.GestureDescription('sign.c');
export const SignD = new fp.GestureDescription('sign.d');
export const SignE = new fp.GestureDescription('sign.e');
export const SignF = new fp.GestureDescription('sign.f');
export const SignG = new fp.GestureDescription('sign.g');
export const SignH = new fp.GestureDescription('sign.h');
export const SignI = new fp.GestureDescription('sign.i');
export const SignL = new fp.GestureDescription('sign.l');
export const SignO = new fp.GestureDescription('sign.o');
export const SignU = new fp.GestureDescription('sign.u');
export const SignV = new fp.GestureDescription('sign.v');
export const SignW = new fp.GestureDescription('sign.w');
export const SignY = new fp.GestureDescription('sign.y');

// 3. Palabras
export const SignOk = new fp.GestureDescription('sign.ok');
export const SignILoveYou = new fp.GestureDescription('sign.i_love_you');
export const SignYes = new fp.GestureDescription('sign.yes'); // Puño cerrado vertical
export const SignNo = new fp.GestureDescription('sign.no');

// --------------------------------------------------------------------------
// Configuración de Dedos y Direcciones
// --------------------------------------------------------------------------

// CERO (0) o Letra O: Pulgar y dedos medio/anular/meñique semicurvos, índice semicurvo
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign0.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
    Sign0.addCurl(finger, fp.FingerCurl.FullCurl, 0.9);
    SignO.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
    SignO.addCurl(finger, fp.FingerCurl.FullCurl, 0.9);
}
Sign0.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
SignO.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);

// UNO (1)
Sign1.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
Sign1.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign1.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
    Sign1.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
}
Sign1.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
Sign1.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 0.9);

// DOS (2) o Letra V
for (let gesture of [Sign2, SignV]) {
    gesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
    gesture.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
    gesture.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
    gesture.addDirection(fp.Finger.Middle, fp.FingerDirection.VerticalUp, 1.0);
    
    gesture.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
    gesture.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);
    gesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
    gesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.9);
}

// TRES (3)
Sign3.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
Sign3.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
Sign3.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
Sign3.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
Sign3.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);

// CUATRO (4)
Sign4.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
Sign4.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.9);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign4.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign4.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// CINCO (5) o Palma Abierta
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign5.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign5.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// SEIS (6) - Pulgar y meñique tocándose/doblados
Sign6.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
Sign6.addCurl(fp.Finger.Pinky, fp.FingerCurl.HalfCurl, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring]) {
    Sign6.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign6.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// SIETE (7) - Pulgar y anular tocándose
Sign7.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
Sign7.addCurl(fp.Finger.Ring, fp.FingerCurl.HalfCurl, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Pinky]) {
    Sign7.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign7.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// OCHO (8) - Pulgar y medio tocándose
Sign8.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
Sign8.addCurl(fp.Finger.Middle, fp.FingerCurl.HalfCurl, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign8.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign8.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// NUEVE (9) - Pulgar e índice tocándose (Igual a F / OK)
Sign9.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
Sign9.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1.0);
for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign9.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    Sign9.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// DIEZ (10) - Pulgar arriba (como thumbs up)
Sign10.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
Sign10.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    Sign10.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra A (Puño cerrado, pulgar al lado)
SignA.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignA.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra B
SignB.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
SignB.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 0.9);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignB.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
    SignB.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
}

// Letra C (Todos medio doblados)
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignC.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
}

// Letra D (Indice arriba, otros formando O)
SignD.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignD.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Thumb, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignD.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
    SignD.addCurl(finger, fp.FingerCurl.FullCurl, 0.9);
}

// Letra E (Todos cerrados fuertemente, uñas tocando palma)
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignE.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra F / SignOk (Pulgar e indice en O, otros arriba)
for(let gesture of [SignF, SignOk]) {
    gesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
    gesture.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1.0);
    for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
        gesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
        gesture.addDirection(finger, fp.FingerDirection.VerticalUp, 1.0);
    }
}

// Letra G (Indice y pulgar horizontal)
SignG.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignG.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft, 1.0);
SignG.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalRight, 1.0);
SignG.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignG.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra H (Indice y medio horizontal)
SignH.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignH.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
SignH.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft, 1.0);
SignH.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalRight, 1.0);
SignH.addDirection(fp.Finger.Middle, fp.FingerDirection.HorizontalLeft, 1.0);
SignH.addDirection(fp.Finger.Middle, fp.FingerDirection.HorizontalRight, 1.0);
SignH.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
SignH.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
SignH.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);

// Letra I (Meñique arriba)
SignI.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
SignI.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring]) {
    SignI.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra L
SignL.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignL.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
SignL.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
SignL.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 1.0);
SignL.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalRight, 1.0);
for(let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignL.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra U (Indice y Medio juntos)
SignU.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignU.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
SignU.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
SignU.addDirection(fp.Finger.Middle, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Thumb, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignU.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// Letra W (Indice, medio, anular)
SignW.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignW.addCurl(fp.Finger.Middle, fp.FingerCurl.NoCurl, 1.0);
SignW.addCurl(fp.Finger.Ring, fp.FingerCurl.NoCurl, 1.0);
SignW.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
SignW.addDirection(fp.Finger.Middle, fp.FingerDirection.VerticalUp, 1.0);
SignW.addDirection(fp.Finger.Ring, fp.FingerDirection.VerticalUp, 1.0);
SignW.addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0);
SignW.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);

// Letra Y
SignY.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
SignY.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
SignY.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
for(let finger of [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring]) {
    SignY.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// I Love You (Rock on)
SignILoveYou.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
SignILoveYou.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
SignILoveYou.addCurl(fp.Finger.Pinky, fp.FingerCurl.NoCurl, 1.0);
SignILoveYou.addDirection(fp.Finger.Index, fp.FingerDirection.VerticalUp, 1.0);
SignILoveYou.addDirection(fp.Finger.Pinky, fp.FingerDirection.VerticalUp, 1.0);
SignILoveYou.addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0);
SignILoveYou.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);

// YES (Puño cerrado como asintiendo)
// Reutilizamos SignS pero con otra clave (se filtrará luego si es necesario)
for(let finger of [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
    SignYes.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
}

// NO (Indice, Medio y Pulgar cerrándose, Anular y Meñique cerrados)
SignNo.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1.0);
SignNo.addCurl(fp.Finger.Middle, fp.FingerCurl.HalfCurl, 1.0);
SignNo.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1.0);
SignNo.addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0);
SignNo.addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0);


export const allGestures = [
    Sign0, Sign1, Sign2, Sign3, Sign4, Sign5, Sign6, Sign7, Sign8, Sign9, Sign10,
    SignA, SignB, SignC, SignD, SignE, SignF, SignG, SignH, SignI, SignL, SignO, SignU, SignV, SignW, SignY,
    SignOk, SignILoveYou, SignYes, SignNo
];
