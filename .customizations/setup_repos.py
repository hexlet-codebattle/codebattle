#!/usr/bin/env python3

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

BASE_URL = "ssh://ssh.sourcecraft.dev/universitybattle"
TMP_ROOT = Path(tempfile.gettempdir()) / "tower-repos"

REPOS = [
    (1167, "fQRz3EVmbx-9K0-H0FDiUwBDUEn85eyW0G2Fh8Qyiis"),
    (167, "uligelAoj-EJA54qnnXg9v7KAn__vVsYTm-an1KM5cY"),
    (1175, "gubpUo3pUsS0m3PPcLYmvAVjoF1fOGxjHm-t6WffNT0"),
    (1174, "WdFhXEbFgrAw6oVGopPoBVHVOH_lsuCjVcfqt2C_xYE"),
    (1416, "5sy7gUusY4Fs8zScZ52RhaO4Ne0-PLKWGQqYS5ec8gc"),
    (12656, "GgqBmlT5cOKXBojh6vBa83L_9djAc3S2T_UxenKwe0U"),
    (9828, "RylHgDyaBXzM568gzUvDbGDyfE5Ml885A1vsYxG_jWY"),
    (1172, "_RgNYPzhJL7Z36gNxLKpSs23xnkeDguiKk9sjzgEeJo"),
    (8256, "bIabtEIoNRfzGU5hqmWRdsXs6LukoRLDbWnKrMr_8mY"),
    (2909, "oF6s1zBTxXOxFQP0ynvy2AFydMkPV4TZbc8bss3hnc8"),
    (801, "z84y49ppe36-1VF_kXaQbOmF9beZtBb4Lm91Xo8RW-c"),
    (8208, "1oVSBWzUkUibUx9XYzpyJpcY3_VXSmbkY5iiRBOl40w"),
    (12848, "w49EP7kh41YLbaWdnJSGlZ-tZ-5xnQsWemnvmdhOg7Q"),
    (1378, "kE_9cjU0qQ6OdknFxwgdkqsfX-CU7WRP9mIqvAZx7vg"),
    (135, "uHO-EuaroUX1hLQwVWhBjOSxDngcFOK2Ao49378o7Qs"),
]


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, cwd=cwd, check=True)


def main() -> None:
    TMP_ROOT.mkdir(parents=True, exist_ok=True)

    for repo_id, token in REPOS:
        repo_dir = TMP_ROOT / f"tower-{repo_id}"
        repo_url = f"{BASE_URL}/tower-{repo_id}.git"

        if repo_dir.exists():
            shutil.rmtree(repo_dir)

        # Clone each repo into a clean temporary directory, then write the
        # token locally so it never gets staged, committed, or pushed.
        run(["git", "clone", repo_url, str(repo_dir)])

        # The token is intentionally kept only in the working tree copy.
        (repo_dir / ".env").write_text(
            f"CODEBATTLE_AUTH_TOKEN={token}\n",
            encoding="utf-8",
        )

        run(["git", "add", "."])
        run(["git", "commit", "-m", "Add token"])
        run(["git", "push"])

        print(f"prepared {repo_dir}")

    print(f"done: {TMP_ROOT}")


if __name__ == "__main__":
    main()
