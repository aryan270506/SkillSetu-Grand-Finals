import logging
from typing import List, Optional
from app.config import settings

logger = logging.getLogger("embedding_service")

_embedding_model = None
DEFAULT_DIMENSION = 384


def get_embedding_model():
    """Lazy-load singleton TextEmbedding model."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from fastembed import TextEmbedding
            logger.info(f"Loading embedding model: {settings.COURSE_EMBEDDING_MODEL}...")
            _embedding_model = TextEmbedding(model_name=settings.COURSE_EMBEDDING_MODEL)
            logger.info(f"Embedding model '{settings.COURSE_EMBEDDING_MODEL}' loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load fastembed model: {e}")
            raise e
    return _embedding_model


def get_embedding_dimension() -> int:
    """Return the output vector dimension for the configured model."""
    # BAAI/bge-small-en-v1.5 has dimension 384
    return DEFAULT_DIMENSION


def embed_text(text: str) -> List[float]:
    """Generate embedding vector for a single text."""
    if not text or not text.strip():
        return [0.0] * get_embedding_dimension()

    model = get_embedding_model()
    embeddings = list(model.embed([text.strip()]))
    vector = embeddings[0].tolist() if hasattr(embeddings[0], "tolist") else list(embeddings[0])
    
    if len(vector) != get_embedding_dimension():
        logger.warning(f"Vector dimension mismatch: expected {get_embedding_dimension()}, got {len(vector)}")
    return vector


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Batch generate embeddings for a list of texts."""
    if not texts:
        return []

    # Clean and replace empty texts with placeholder to preserve indexing
    cleaned_texts = [t.strip() if t and t.strip() else "empty text" for t in texts]
    
    model = get_embedding_model()
    raw_embeddings = list(model.embed(cleaned_texts, batch_size=settings.COURSE_EMBEDDING_BATCH_SIZE))
    
    results = []
    dim = get_embedding_dimension()
    for idx, emb in enumerate(raw_embeddings):
        if not texts[idx] or not texts[idx].strip():
            results.append([0.0] * dim)
        else:
            vec = emb.tolist() if hasattr(emb, "tolist") else list(emb)
            results.append(vec)
            
    return results
