import asyncio
import random
import logging
from typing import Callable, Any
from .core import Task, TaskStatus

logger = logging.getLogger("NexusFlow.Retry")

class RetryStrategy:
    def __init__(self, base_delay: float = 1.0, max_delay: float = 10.0, backoff_factor: float = 2.0):
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor

    async def execute_with_retry(self, func: Callable, task: Task, *args, **kwargs) -> Any:
        while task.retries <= task.max_retries:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                task.retries += 1
                if task.retries > task.max_retries:
                    task.status = TaskStatus.FAILED
                    task.error_message = f"Max retries reached. Last error: {str(e)}"
                    logger.error(f"Task {task.name} permanently failed.")
                    raise e
                
                # Exponential backoff with jitter
                delay = min(self.max_delay, self.base_delay * (self.backoff_factor ** (task.retries - 1)))
                jitter = delay * 0.1 * random.uniform(-1, 1)
                final_delay = delay + jitter
                
                task.status = TaskStatus.RETRYING
                logger.warning(f"Task {task.name} failed (Attempt {task.retries}/{task.max_retries}). Retrying in {final_delay:.2f}s...")
                await asyncio.sleep(final_delay)
