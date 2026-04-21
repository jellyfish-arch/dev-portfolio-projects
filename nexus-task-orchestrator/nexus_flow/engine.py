import asyncio
import logging
from typing import Dict, List, Callable, Coroutine, Any
from .core import Task, TaskStatus, TaskPriority

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NexusFlow.Engine")

class TaskEngine:
    def __init__(self, concurrency: int = 3, monitor: Any = None, retry_strategy: Any = None):
        self.queue = asyncio.PriorityQueue()
        self.concurrency = concurrency
        self.running_tasks: Dict[str, Task] = {}
        self.completed_tasks: List[Task] = []
        self.failed_tasks: List[Task] = []
        self.monitor = monitor
        self.retry_strategy = retry_strategy
        self._stop_event = asyncio.Event()

    async def add_task(self, task: Task):
        logger.info(f"Adding task: {task.name} (Priority: {task.priority.name})")
        await self.queue.put((task.priority, task))

    async def _worker(self):
        while not self._stop_event.is_set():
            try:
                priority, task = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                task.status = TaskStatus.RUNNING
                if self.monitor: self.monitor.notify(task)
                self.running_tasks[task.id] = task
                
                try:
                    # In a real system, task execution would call a specific function
                    # For demo, we simulate it
                    if self.retry_strategy:
                        await self.retry_strategy.execute_with_retry(asyncio.sleep, task, 1)
                    else:
                        await asyncio.sleep(1)
                    
                    task.status = TaskStatus.COMPLETED
                    self.completed_tasks.append(task)
                except Exception as e:
                    task.status = TaskStatus.FAILED
                    task.error_message = str(e)
                    self.failed_tasks.append(task)
                finally:
                    if self.monitor: self.monitor.notify(task)
                    self.running_tasks.pop(task.id, None)
                    self.queue.task_done()
                    
            except asyncio.TimeoutError:
                continue

    async def run(self):
        logger.info("Starting Task Engine...")
        workers = [asyncio.create_task(self._worker()) for _ in range(self.concurrency)]
        await self._stop_event.wait()
        
        # Wait for all workers to finish
        for w in workers:
            w.cancel()
        await asyncio.gather(*workers, return_exceptions=True)

    def stop(self):
        logger.info("Stopping Task Engine...")
        self._stop_event.set()
