import csv
import io
from datetime import datetime


def parse_date(date):
    """Accepts MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD"""
    DATE_FORMATS = (
        "%m/%d/%y",
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d/%m/%y",
        "%d-%m-%Y",
        "%d-%m-%y",
    )
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(date, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format: {date}")


def decode_csv_file(file_obj):
    raw = file_obj.read()

    decoded = None
    for enc in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            decoded = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if decoded is None:
        raise ValueError("Could not decode file - unsupported encoding")

    # normalize line endings of windows (\r\n) and old mac ("\r") to unix ("\n")
    decoded = decoded.replace("\r\n", "\n").replace("\r", "\n")

    reader = csv.DictReader(io.StringIO(decoded))
    if not reader.fieldnames:
        raise ValueError("CSV appears to be empty")

    reader.fieldnames = [f.strip() for f in reader.fieldnames]

    return reader
