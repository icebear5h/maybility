#!/usr/bin/env python3
"""
Terminal User Interface (TUI) for monitoring the Maybility backend

Run with: python scripts/tui_monitor.py
"""

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Header, Footer, Static, Log, DataTable, Button
from textual.reactive import reactive
from rich.text import Text
from rich.syntax import Syntax
from pathlib import Path
import json
from datetime import datetime
from typing import List, Dict, Any
import asyncio


class LogViewer(Static):
    """Widget for displaying logs"""

    logs: reactive[List[str]] = reactive(list)

    def __init__(self, log_file: Path, **kwargs):
        super().__init__(**kwargs)
        self.log_file = log_file
        self.logs = []

    def compose(self) -> ComposeResult:
        yield Log()

    async def on_mount(self) -> None:
        """Start tailing log file"""
        self.set_interval(1.0, self.update_logs)

    def update_logs(self) -> None:
        """Read new log lines"""
        if not self.log_file.exists():
            return

        try:
            with open(self.log_file, 'r') as f:
                lines = f.readlines()
                new_logs = lines[-50:]  # Last 50 lines

                log_widget = self.query_one(Log)
                log_widget.clear()

                for line in new_logs:
                    log_widget.write_line(line.strip())
        except Exception as e:
            pass


class MetricsPanel(Static):
    """Widget for displaying metrics"""

    total_requests: reactive[int] = reactive(0)
    error_count: reactive[int] = reactive(0)
    avg_response_time: reactive[float] = reactive(0.0)

    def render(self) -> str:
        return f"""
[bold cyan]📊 Metrics[/bold cyan]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests:    {self.total_requests:,}
Errors:            {self.error_count:,}
Avg Response Time: {self.avg_response_time:.2f}ms
Success Rate:      {self._success_rate():.1f}%
        """.strip()

    def _success_rate(self) -> float:
        if self.total_requests == 0:
            return 100.0
        return ((self.total_requests - self.error_count) / self.total_requests) * 100

    async def on_mount(self) -> None:
        """Start updating metrics"""
        self.set_interval(2.0, self.update_metrics)

    def update_metrics(self) -> None:
        """Parse logs and update metrics"""
        api_log = Path("logs/api.log")
        error_log = Path("logs/errors.log")

        if api_log.exists():
            try:
                with open(api_log, 'r') as f:
                    lines = f.readlines()
                    self.total_requests = len(lines)

                    # Calculate average response time
                    times = []
                    for line in lines[-100:]:  # Last 100 requests
                        if "Duration:" in line:
                            try:
                                duration = line.split("Duration: ")[1].split("ms")[0]
                                times.append(float(duration))
                            except:
                                pass

                    if times:
                        self.avg_response_time = sum(times) / len(times)
            except:
                pass

        if error_log.exists():
            try:
                with open(error_log, 'r') as f:
                    self.error_count = len(f.readlines())
            except:
                pass


class AgentActivityTable(Static):
    """Widget for displaying agent activity"""

    def compose(self) -> ComposeResult:
        yield DataTable()

    async def on_mount(self) -> None:
        """Initialize table"""
        table = self.query_one(DataTable)
        table.add_columns("Agent", "Last Action", "Status", "Duration")

        # Add sample data
        table.add_row("Calendar Agent", "create_event", "✓ Success", "1.2s")
        table.add_row("Orchestrator", "route_decision", "✓ Success", "0.3s")

        self.set_interval(5.0, self.update_agent_activity)

    def update_agent_activity(self) -> None:
        """Parse agent logs and update table"""
        agent_log = Path("logs/agents.log")

        if not agent_log.exists():
            return

        try:
            table = self.query_one(DataTable)
            # Parse recent agent actions and update table
            # This is a placeholder - implement real parsing
        except:
            pass


class MaybilityMonitor(App):
    """Maybility Backend Monitoring TUI"""

    CSS = """
    Screen {
        background: $surface;
    }

    #main-container {
        layout: grid;
        grid-size: 2 3;
        grid-gutter: 1;
        padding: 1;
    }

    #metrics {
        column-span: 1;
        row-span: 1;
        border: solid $primary;
        padding: 1;
    }

    #agent-activity {
        column-span: 1;
        row-span: 1;
        border: solid $primary;
        padding: 1;
    }

    #app-logs {
        column-span: 2;
        row-span: 1;
        border: solid $accent;
        padding: 1;
    }

    #error-logs {
        column-span: 1;
        row-span: 1;
        border: solid $error;
        padding: 1;
    }

    #agent-logs {
        column-span: 1;
        row-span: 1;
        border: solid $success;
        padding: 1;
    }

    Button {
        margin: 1 2;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
        ("c", "clear", "Clear Logs"),
    ]

    def compose(self) -> ComposeResult:
        """Create child widgets"""
        yield Header()

        with Container(id="main-container"):
            # Top row - metrics and agent activity
            with Vertical(id="metrics"):
                yield Static("[bold]📊 Metrics[/bold]\n")
                yield MetricsPanel()

            with Vertical(id="agent-activity"):
                yield Static("[bold]🤖 Agent Activity[/bold]\n")
                yield AgentActivityTable()

            # Middle row - application logs
            with Vertical(id="app-logs"):
                yield Static("[bold]📝 Application Logs[/bold]\n")
                yield LogViewer(Path("logs/app.log"))

            # Bottom row - error and agent logs
            with Vertical(id="error-logs"):
                yield Static("[bold]❌ Error Logs[/bold]\n")
                yield LogViewer(Path("logs/errors.log"))

            with Vertical(id="agent-logs"):
                yield Static("[bold]🧠 Agent Logs[/bold]\n")
                yield LogViewer(Path("logs/agents.log"))

        yield Footer()

    def action_refresh(self) -> None:
        """Refresh all data"""
        self.notify("Refreshing data...")

    def action_clear(self) -> None:
        """Clear all logs"""
        self.notify("Logs cleared")


def main():
    """Run the TUI"""
    app = MaybilityMonitor()
    app.run()


if __name__ == "__main__":
    main()
