# FarmaPlus ETL / jobs

Python utilities and pipelines for imports, enrichment, or scheduled work.

```bash
cd services/etl
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Add a `temp/` directory locally for scratch files; it is gitignored at `services/etl/temp/`.
