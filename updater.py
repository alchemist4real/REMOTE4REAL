"""
REMOTE4REAL — Auto-Update Checker
Non-blocking background update detector using GitHub Releases API.
"""

import json
import time
import re
import urllib.request
import urllib.error
import logging
import threading
from typing import Optional, Dict, Any, Callable
from version import __version__, __repo__, __github_url__, __api_release_url__

logger = logging.getLogger("REMOTE4REAL.Updater")

def parse_version_tuple(version_str: str) -> tuple:
    """Extract integer numbers from a version string like 'v1.2.3' -> (1, 2, 3)."""
    if not version_str:
        return (0, 0, 0)
    cleaned = re.sub(r'^[^\d]*', '', version_str.strip())
    parts = re.split(r'[\.\-\+]', cleaned)
    numeric_parts = []
    for part in parts:
        if part.isdigit():
            numeric_parts.append(int(part))
        else:
            break
    while len(numeric_parts) < 3:
        numeric_parts.append(0)
    return tuple(numeric_parts[:3])

def is_newer_version(current_ver: str, remote_ver: str) -> bool:
    """Compare versions, return True if remote_ver > current_ver."""
    return parse_version_tuple(remote_ver) > parse_version_tuple(current_ver)

class UpdateChecker:
    def __init__(self, current_version: str = __version__):
        self.current_version = current_version
        self.cached_result: Optional[Dict[str, Any]] = None
        self.last_check_time: float = 0
        self.cache_ttl_seconds: float = 3600 * 6  # 6 hours cache

    def check_updates(self, force: bool = False) -> Dict[str, Any]:
        """
        Query GitHub Releases API for the latest published release.
        Returns a dict containing update status and release metadata.
        """
        now = time.time()
        if not force and self.cached_result and (now - self.last_check_time < self.cache_ttl_seconds):
            return self.cached_result

        result = {
            "has_update": False,
            "current_version": self.current_version,
            "latest_version": self.current_version,
            "release_name": "",
            "release_url": f"{__github_url__}/releases",
            "body": "",
            "published_at": "",
            "error": None
        }

        try:
            req = urllib.request.Request(
                __api_release_url__,
                headers={
                    "User-Agent": f"REMOTE4REAL-Updater/{self.current_version}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            with urllib.request.urlopen(req, timeout=7) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    tag_name = data.get("tag_name", "")
                    latest_ver = tag_name.lstrip("vV")
                    
                    result["latest_version"] = latest_ver or tag_name
                    result["release_name"] = data.get("name") or tag_name
                    result["release_url"] = data.get("html_url") or f"{__github_url__}/releases"
                    result["body"] = data.get("body", "")
                    result["published_at"] = data.get("published_at", "")
                    
                    if is_newer_version(self.current_version, latest_ver):
                        result["has_update"] = True
                        logger.info(f"Newer update found: {latest_ver} (Current: {self.current_version})")
                    else:
                        logger.info(f"REMOTE4REAL is up to date (Version {self.current_version})")

                    self.cached_result = result
                    self.last_check_time = now
                    return result
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # No releases published yet on repo
                result["error"] = "NO_RELEASES_PUBLISHED"
            else:
                result["error"] = f"HTTP_{e.code}"
            logger.debug(f"GitHub Releases API responded with HTTP {e.code}")
        except Exception as e:
            result["error"] = str(e)
            logger.debug(f"Update check connection notice: {e}")

        self.cached_result = result
        self.last_check_time = now
        return result

    def check_updates_async(self, callback: Callable[[Dict[str, Any]], None], force: bool = False):
        """Run update check in a separate daemon thread and call callback with result."""
        def _worker():
            res = self.check_updates(force=force)
            try:
                callback(res)
            except Exception as e:
                logger.error(f"Error in update callback: {e}")

        t = threading.Thread(target=_worker, daemon=True, name="UpdateCheckerWorker")
        t.start()

# Global default instance
_default_checker = UpdateChecker()

def check_for_updates(force: bool = False) -> Dict[str, Any]:
    return _default_checker.check_updates(force=force)

def check_for_updates_async(callback: Callable[[Dict[str, Any]], None], force: bool = False):
    _default_checker.check_updates_async(callback, force=force)

if __name__ == "__main__":
    print(f"Checking updates for REMOTE4REAL v{__version__}...")
    res = check_for_updates(force=True)
    print(json.dumps(res, indent=2))
