from transformers import pipeline

_pipe = None


def get_pipeline():
    global _pipe
    if _pipe is None:
        # ProsusAI/finbert is trained specifically on financial text
        # outputs: positive / negative / neutral with a confidence score
        _pipe = pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            top_k=None,  # return all three class scores
        )
    return _pipe


def score_headlines(headlines: list[str]) -> list[dict]:
    """
    Returns a list of dicts:
      { "text": "...", "positive": 0.9, "negative": 0.05, "neutral": 0.05 }
    """
    if not headlines:
        return []

    pipe = get_pipeline()
    raw = pipe(headlines, truncation=True, max_length=512, batch_size=16)

    results = []
    for text, label_scores in zip(headlines, raw):
        scores = {item["label"]: round(item["score"], 4) for item in label_scores}
        results.append(
            {
                "text": text,
                "positive": scores.get("positive", 0),
                "negative": scores.get("negative", 0),
                "neutral": scores.get("neutral", 0),
            }
        )
    return results
