#!/usr/bin/env python3
"""
Notification script for testing skill activation
"""

import sys

def notify():
    """Print a notification that the testing skill has been loaded"""
    message = """
╭─────────────────────────────────────────────────────────╮
│  🧪 TESTING SKILL LOADED                                │
│                                                         │
│  • TDD Workflow: RED → GREEN → REFACTOR                │
│  • Test user behavior, not implementation              │
│  • Use renderComponent() helper pattern                │
│  • Organize with describe blocks                       │
╰─────────────────────────────────────────────────────────╯
"""
    print(message, file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(notify())
