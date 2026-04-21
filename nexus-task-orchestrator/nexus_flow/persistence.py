import json
import os
from typing import List
from .core import Task

class PersistenceManager:
    def __init__(self, storage_path: str = "tasks_state.json"):
        self.storage_path = storage_path

    def save_tasks(self, tasks: List[Task]):
        data = [task.dict() for task in tasks]
        with open(self.storage_path, 'w') as f:
            json.dump(data, f, indent=4, default=str)

    def load_tasks(self) -> List[Task]:
        if not os.path.exists(self.storage_path):
            return []
        
        with open(self.storage_path, 'r') as f:
            data = json.load(f)
            return [Task(**item) for item in data]
