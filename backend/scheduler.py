"""
scheduler.py
────────────
TEST MODE: runs automation every 1 minute
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler

log = logging.getLogger(__name__)


def start_scheduler() -> None:
    """
    TEST VERSION:
    Runs automation.run() every 1 minute.
    """

    from automation import run as send_emails  # avoid circular import

    scheduler = BackgroundScheduler(timezone="UTC")

    scheduler.add_job(
        func=send_emails,
        trigger="interval",   # 👈 IMPORTANT CHANGE
        minutes=1,            # 👈 EVERY 1 MINUTE
        id="test_email_job",
        name="Test shortlist email every minute",
        replace_existing=True,
    )

    scheduler.start()
    log.info("TEST Scheduler started — running every 1 minute.")