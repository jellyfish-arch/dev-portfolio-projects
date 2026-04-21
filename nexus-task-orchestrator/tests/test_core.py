import pytest
from nexus_flow.core import Task, TaskStatus, TaskPriority

def test_task_creation_defaults():
    task = Task(name="Test Task")
    assert task.status == TaskStatus.PENDING
    assert task.priority == TaskPriority.MEDIUM
    assert task.retries == 0

def test_task_validation_empty_name():
    with pytest.raises(ValueError, match="Task name cannot be empty"):
        Task(name="")

def test_task_priority_ordering():
    assert TaskPriority.HIGH < TaskPriority.MEDIUM
    assert TaskPriority.CRITICAL < TaskPriority.HIGH

@pytest.mark.parametrize("priority", [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.CRITICAL
])
def test_task_with_different_priorities(priority):
    task = Task(name="Priority Task", priority=priority)
    assert task.priority == priority
