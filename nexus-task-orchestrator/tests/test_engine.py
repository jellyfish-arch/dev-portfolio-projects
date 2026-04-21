import asyncio
import pytest
from unittest.mock import MagicMock, patch
from nexus_flow.core import Task, TaskStatus, TaskPriority
from nexus_flow.engine import TaskEngine

@pytest.mark.asyncio
async def test_engine_task_execution():
    engine = TaskEngine(concurrency=1)
    task = Task(name="Async Test Task")
    
    # We add the task
    await engine.add_task(task)
    
    # Run the engine briefly
    run_task = asyncio.create_task(engine.run())
    await asyncio.sleep(1.5) # Wait for task to "execute"
    engine.stop()
    await run_task
    
    assert task.status == TaskStatus.COMPLETED
    assert len(engine.completed_tasks) == 1

@pytest.mark.asyncio
async def test_engine_priority_execution():
    engine = TaskEngine(concurrency=1)
    
    low_task = Task(name="Low", priority=TaskPriority.LOW)
    high_task = Task(name="High", priority=TaskPriority.HIGH)
    
    # Add tasks (High after Low, but it should be picked up first if we were using a queue)
    # Note: In this simple test, we want to see if the PriorityQueue logic holds
    await engine.add_task(low_task)
    await engine.add_task(high_task)
    
    # Run the engine
    run_task = asyncio.create_task(engine.run())
    await asyncio.sleep(2.5)
    engine.stop()
    await run_task
    
    # Check order in completed tasks
    # High should be first because of priority 1 vs 3
    assert engine.completed_tasks[0].name == "High"
    assert engine.completed_tasks[1].name == "Low"
