"""
SentenceBuilder: Motor de formulación de oraciones y gestión de tiempo para Lengua de Señas.
Acumula señas en tiempo real, concatena letras y palabras inteligentemente,
controla anti-rebotes y detecta silencios/inactividad para finalizar oraciones completas.
"""

import time
from typing import Optional, Dict, Any, List

class SentenceBuilder:
    def __init__(self, inactivity_timeout: float = 3.5, debounce_seconds: float = 0.9):
        """
        :param inactivity_timeout: Segundos de pausa/inactividad para cerrar la oración.
        :param debounce_seconds: Tiempo mínimo entre la misma seña para evitar duplicados accidentales.
        """
        self.inactivity_timeout = inactivity_timeout
        self.debounce_seconds = debounce_seconds
        
        self.tokens_es: List[str] = []
        self.tokens_en: List[str] = []
        self.raw_tokens: List[Dict[str, Any]] = []
        
        self.last_token_id: Optional[str] = None
        self.last_token_time: float = 0.0
        self.sentence_start_time: float = 0.0
        self.is_finalized: bool = False
        self.finalized_at: float = 0.0
        
        self.history: List[Dict[str, Any]] = []
        self.max_history: int = 15
        
        # Palabras interrogativas comunes para puntuación automática
        self.question_words_es = {
            "que", "qué", "como", "cómo", "donde", "dónde", "cuando", "cuándo",
            "quien", "quién", "por que", "por qué", "cual", "cuál", "cuanto", "cuánto"
        }
        self.question_words_en = {
            "what", "how", "where", "when", "why", "who", "which", "whose", "whom"
        }

    def _is_single_letter(self, text: str, token_id: str = "") -> bool:
        """Determina si el token corresponde a una letra individual del abecedario."""
        cleaned = text.strip()
        if len(cleaned) == 1 and cleaned.isalpha():
            return True
        if token_id.startswith("sign.alphabet_") or token_id.startswith("sign.letter_"):
            return True
        return False

    def add_token(self, token_data: Dict[str, Any], current_time: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """
        Procesa una nueva seña reconocida por el modelo.
        Aplica debounce para evitar duplicados si la mano permanece en la misma seña.
        """
        now = current_time if current_time is not None else time.time()
        
        if isinstance(token_data, str):
            token_data = {"id": token_data, "name_es": token_data, "name_en": token_data}
        elif not isinstance(token_data, dict):
            return None

        token_id = token_data.get("id", "")
        name_es = token_data.get("name_es") or token_data.get("text", "") or token_id
        name_en = token_data.get("name_en") or name_es

        if not name_es:
            return None

        # Si la oración anterior ya estaba finalizada, iniciamos una nueva automáticamente
        if self.is_finalized:
            self._archive_and_reset(now)

        # Anti-rebote: Si es el mismo token y ocurrió hace menos de debounce_seconds, ignorar
        if token_id == self.last_token_id and (now - self.last_token_time) < self.debounce_seconds:
            self.last_token_time = now
            return None

        # Si es la primera palabra de la frase
        if not self.tokens_es:
            self.sentence_start_time = now

        is_letter = self._is_single_letter(name_es, token_id)
        prev_was_letter = (
            bool(self.raw_tokens) and 
            self._is_single_letter(self.raw_tokens[-1].get("name_es", ""), self.raw_tokens[-1].get("id", ""))
        )

        # Concatenación inteligente:
        # Si la seña actual es una letra y la anterior también era letra -> deletreo conjunto
        if is_letter and prev_was_letter and self.tokens_es:
            self.tokens_es[-1] = self.tokens_es[-1] + name_es.upper()
            self.tokens_en[-1] = self.tokens_en[-1] + name_en.upper()
        else:
            word_es = name_es.upper() if is_letter else name_es
            word_en = name_en.upper() if is_letter else name_en
            self.tokens_es.append(word_es)
            self.tokens_en.append(word_en)

        self.raw_tokens.append(token_data)
        self.last_token_id = token_id
        self.last_token_time = now

        sentence_es = self.get_formatted_sentence(lang="es", final=False)
        sentence_en = self.get_formatted_sentence(lang="en", final=False)

        return {
            "type": "sentence_update",
            "new_token": {
                "id": token_id,
                "name_es": name_es,
                "name_en": name_en,
                "is_letter": is_letter
            },
            "accumulated_sentence": sentence_es,
            "accumulated_sentence_en": sentence_en,
            "words": list(self.tokens_es),
            "words_en": list(self.tokens_en),
            "words_count": len(self.tokens_es),
            "is_final": False,
            "elapsed_seconds": round(now - self.sentence_start_time, 2)
        }

    def check_inactivity(self, current_time: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """
        Verifica si se cumplió el tiempo de inactividad para dar por concluida la frase.
        """
        now = current_time if current_time is not None else time.time()

        if not self.tokens_es or self.is_finalized:
            return None

        if (now - self.last_token_time) >= self.inactivity_timeout:
            return self.finalize(now)

        return None

    def finalize(self, current_time: Optional[float] = None) -> Dict[str, Any]:
        """Cierra y puntúa la oración actual."""
        now = current_time if current_time is not None else time.time()
        self.is_finalized = True
        self.finalized_at = now

        final_es = self.get_formatted_sentence(lang="es", final=True)
        final_en = self.get_formatted_sentence(lang="en", final=True)
        duration = round(now - self.sentence_start_time, 2)

        final_payload = {
            "type": "sentence_complete",
            "sentence": final_es,
            "sentence_en": final_en,
            "words": list(self.tokens_es),
            "words_en": list(self.tokens_en),
            "words_count": len(self.tokens_es),
            "is_final": True,
            "duration_seconds": duration,
            "timestamp": now
        }

        self.history.append(final_payload)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        return final_payload

    def get_formatted_sentence(self, lang: str = "es", final: bool = False) -> str:
        """Formatea la lista de palabras aplicando capitalización y signos de puntuación."""
        tokens = self.tokens_es if lang == "es" else self.tokens_en
        if not tokens:
            return ""

        text = " ".join(tokens).strip()
        if not text:
            return ""

        text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()

        if final:
            if not text.endswith((".", "!", "?")):
                first_word = tokens[0].lower().strip()
                if lang == "es":
                    is_question = any(first_word.startswith(qw) for qw in self.question_words_es)
                    if is_question:
                        text = f"¿{text}?"
                    else:
                        text = f"{text}."
                else:
                    is_question = any(first_word.startswith(qw) for qw in self.question_words_en)
                    if is_question:
                        text = f"{text}?"
                    else:
                        text = f"{text}."

        return text

    def _archive_and_reset(self, now: float):
        """Reinicia la oración activa conservando los contadores para la siguiente."""
        self.tokens_es = []
        self.tokens_en = []
        self.raw_tokens = []
        self.last_token_id = None
        self.last_token_time = 0.0
        self.sentence_start_time = now
        self.is_finalized = False
        self.finalized_at = 0.0

    def clear(self) -> Dict[str, Any]:
        """Limpia manualmente la oración en curso."""
        self._archive_and_reset(time.time())
        return {
            "type": "sentence_cleared",
            "accumulated_sentence": "",
            "accumulated_sentence_en": "",
            "words": [],
            "is_final": False
        }

    def get_status(self) -> Dict[str, Any]:
        """Retorna el estado actual de la sesión de traducción."""
        now = time.time()
        return {
            "accumulated_sentence": self.get_formatted_sentence("es", final=self.is_finalized),
            "accumulated_sentence_en": self.get_formatted_sentence("en", final=self.is_finalized),
            "is_final": self.is_finalized,
            "words_count": len(self.tokens_es),
            "seconds_since_last_token": round(now - self.last_token_time, 2) if self.last_token_time > 0 else None,
            "timeout_setting": self.inactivity_timeout
        }
