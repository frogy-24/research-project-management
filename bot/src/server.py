from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Service:
    name: str
    command: list[str]


SERVICES: list[Service] = [
    Service(name="copilot_api", command=["npx", "copilot-api", "start"]),
    Service(name="mcp_server", command=["uv", "run", "python", "-m", "src.mcp.server"]),
    Service(
        name="fastapi",
        command=[
            "uv",
            "run",
            "uvicorn",
            "src.api.app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ],
    ),
]


def _resolve_executable(executable: str) -> str | None:
    candidates = [executable]
    if os.name == "nt" and Path(executable).suffix == "":
        candidates.extend([f"{executable}.cmd", f"{executable}.exe", f"{executable}.bat"])

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved is not None:
            return resolved
    return None


def _check_dependencies(services: list[Service]) -> None:
    missing: list[str] = []
    for service in services:
        executable = service.command[0]
        if _resolve_executable(executable) is None and executable not in missing:
            missing.append(executable)

    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(f"Missing required command(s): {joined}")


def _start_service(service: Service) -> subprocess.Popen[str]:
    creationflags = 0
    if os.name == "nt":
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP

    resolved_executable = _resolve_executable(service.command[0])
    if resolved_executable is None:
        raise RuntimeError(f"Cannot resolve executable: {service.command[0]}")

    command = [resolved_executable, *service.command[1:]]
    print(f"[start] {service.name}: {' '.join(service.command)}")
    return subprocess.Popen(
        command,
        cwd=str(ROOT_DIR),
        text=True,
        creationflags=creationflags,
    )


def _stop_process(proc: subprocess.Popen[str], name: str) -> None:
    if proc.poll() is not None:
        return

    try:
        if os.name == "nt":
            proc.send_signal(signal.CTRL_BREAK_EVENT)
        else:
            proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

    print(f"[stop] {name}")


def _filter_services(include_copilot: bool) -> list[Service]:
    if include_copilot:
        return SERVICES
    return [service for service in SERVICES if service.name != "copilot_api"]


def run_all(include_copilot: bool) -> int:
    services = _filter_services(include_copilot)
    if not services:
        print("No service selected.")
        return 1

    _check_dependencies(services)

    processes: list[tuple[Service, subprocess.Popen[str]]] = []
    try:
        for service in services:
            proc = _start_service(service)
            processes.append((service, proc))

        print("[ready] Services are running. Press Ctrl+C to stop.")
        while True:
            for service, proc in processes:
                code = proc.poll()
                if code is not None:
                    print(f"[error] {service.name} exited with code {code}")
                    return code if code != 0 else 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n[shutdown] Received Ctrl+C, stopping services...")
        return 0
    finally:
        for service, proc in reversed(processes):
            _stop_process(proc, service.name)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start required bot servers (copilot-api, MCP, FastAPI)."
    )
    parser.add_argument(
        "--without-copilot",
        action="store_true",
        help="Start only MCP + FastAPI (skip copilot-api).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        return run_all(include_copilot=not args.without_copilot)
    except RuntimeError as exc:
        print(f"[error] {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())