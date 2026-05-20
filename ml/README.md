# Nihon AI — ML

Training and research for the JLPT difficulty classifier. Separate from `backend/` because
training has a different lifecycle than serving; the backend consumes the resulting model.

## Layout

```
data/        # datasets (git-ignored — built by scripts)
notebooks/   # exploration, error analysis, confusion matrices
scripts/     # build_dataset.py, train_classifier.py, evaluate.py
```

## Dev

```bash
pip install -e ".[dev]"
```

The trained classifier is published to the HuggingFace Hub and pulled by the backend at runtime.
