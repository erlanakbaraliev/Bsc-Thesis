from datetime import datetime


def parse_date(val):
    """Accepts M/D/YY, M/D/YYYY, or YYYY-MM-DD."""
    for fmt in ("%m/%d/%y", "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(val.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format: {val}")
