import asyncio
from nexus_flow.core import Task, TaskPriority
from nexus_flow.engine import TaskEngine
from nexus_flow.monitor import TaskMonitor, console_logger
from nexus_flow.retry import RetryStrategy
from nexus_flow.persistence import PersistenceManager

async def main():
    print("🚀 Initializing NexusFlow Demo...")
    
    # Setup components
    monitor = TaskMonitor()
    monitor.subscribe(console_logger)
    
    retry_strategy = RetryStrategy(base_delay=0.5, max_delay=2.0)
    engine = TaskEngine(concurrency=2, monitor=monitor, retry_strategy=retry_strategy)
    persistence = PersistenceManager()

    # Create some tasks
    tasks = [
        Task(name="Database Backup", priority=TaskPriority.HIGH),
        Task(name="Email Notifications", priority=TaskPriority.LOW),
        Task(name="Data Processing", priority=TaskPriority.MEDIUM),
        Task(name="URGENT: Server Patch", priority=TaskPriority.CRITICAL),
    ]

    # Add tasks to engine
    for task in tasks:
        await engine.add_task(task)

    # Run engine in background
    print("✨ System started. Processing queue...")
    engine_task = asyncio.create_task(engine.run())

    # Wait for tasks to complete (simulated time)
    await asyncio.sleep(8)
    
    # Save state
    print("\n💾 Saving system state...")
    persistence.save_tasks(engine.completed_tasks + engine.failed_tasks)
    
    # Stop engine
    engine.stop()
    await engine_task
    print("\n✅ Demo finished. All tasks processed.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
