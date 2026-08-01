#!/usr/bin/python3

import subprocess
import shutil
import sys
import os

JSDOC_CONFIG = os.path.join(os.getcwd(), "docs/apidoc.json")
DOCS_DIR = os.path.join(os.getcwd(), "html")
PNPM = shutil.which("pnpm.cmd" if os.name == "nt" else "pnpm") or "pnpm"

try:
    print("🗑️ Deleting html folder...")
    shutil.rmtree(DOCS_DIR, ignore_errors=True)
    print("🚀 Generating JSDoc...")
    subprocess.run([PNPM, "exec", "jsdoc", "-c", JSDOC_CONFIG], check=True)
except (OSError, subprocess.CalledProcessError) as e:
    print("❌ Error generating JSDoc:", e)
    sys.exit(1)
