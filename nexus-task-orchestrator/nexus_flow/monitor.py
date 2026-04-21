from typing import List, Callable
from .core import Task, TaskStatus

class TaskMonitor:
    """Implement the Observer pattern for monitoring task events."""
    def __init__(self):
        self._subscribers: List[Callable[[Task], None]] = []

    def subscribe(self, callback: Callable[[Task], None]):
        self._subscribers.append(callback)

    def notify(self, task: Task):
        for callback in self._subscribers:
            try:
                callback(task)
            except Exception:
                pass # Monitors shouldn't break the engine

def console_logger(task: Task):
    color = "\033[92m" if task.status == TaskStatus.COMPLETED else "\033[91m" if task.status == TaskStatus.FAILED else "\033[94m"
    reset = "\033[0m"
    print(f"{color}[MONITOR]{reset} Task '{task.name}' status changed to {task.status.value.upper()}")
