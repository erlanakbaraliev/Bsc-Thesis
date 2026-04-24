import csv
import io
import os
from datetime import datetime


def parse_date(date):
    """Accepts MM/DD/YY, MM/DD/YYYY, YYYY-MM-DD"""
    date = date.strip()

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


class SettingsError(Exception):
    pass


DB_ENV = ("sqlite", "postgresql")


def get_db_env():
    db_env = os.getenv("DB_ENV", "postgresql")
    if db_env not in DB_ENV:
        raise SettingsError(
            f"DB_ENV: {db_env} missing from config map. Known envs: {DB_ENV}"
        )
    print(f"Database environment: {db_env}")
    return db_env


def create_db_setup(config_map, db_env):
    try:
        db_setup = config_map[db_env]
    except KeyError as exc:
        raise SettingsError(
            f"DB_ENV: {db_env} missing from config map. Know evns: {config_map.keys}"
        ) from exc
    return db_setup
