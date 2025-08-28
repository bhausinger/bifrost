import asyncio
import json
import time
import uuid
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import redis.asyncio as redis

from config.settings import settings
from models.schemas import ScrapingResult, TaskStatus
from core.logging import get_logger

logger = get_logger(__name__)


class QueuePriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


@dataclass
class ScrapingTask:
    task_id: str
    artist_names: List[str]
    priority: QueuePriority
    use_playwright: bool
    max_platforms: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0.0
    results: List[ScrapingResult] = None
    error_message: Optional[str] = None
    estimated_duration: float = 0.0
    user_id: Optional[str] = None
    
    def __post_init__(self):
        if self.results is None:
            self.results = []
        # Estimate duration based on number of artists (2-5 seconds per artist)
        self.estimated_duration = len(self.artist_names) * 3.5
    
    def to_dict(self):
        return {
            'task_id': self.task_id,
            'artist_names': self.artist_names,
            'priority': self.priority.value,
            'use_playwright': self.use_playwright,
            'max_platforms': self.max_platforms,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status.value,
            'progress': self.progress,
            'results': [result.dict() if hasattr(result, 'dict') else result for result in self.results],
            'error_message': self.error_message,
            'estimated_duration': self.estimated_duration,
            'user_id': self.user_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]):
        return cls(
            task_id=data['task_id'],
            artist_names=data['artist_names'],
            priority=QueuePriority(data['priority']),
            use_playwright=data['use_playwright'],
            max_platforms=data['max_platforms'],
            created_at=datetime.fromisoformat(data['created_at']),
            started_at=datetime.fromisoformat(data['started_at']) if data.get('started_at') else None,
            completed_at=datetime.fromisoformat(data['completed_at']) if data.get('completed_at') else None,
            status=TaskStatus(data['status']),
            progress=data['progress'],
            results=data.get('results', []),
            error_message=data.get('error_message'),
            estimated_duration=data['estimated_duration'],
            user_id=data.get('user_id')
        )


class ScrapingQueueManager:
    """
    Advanced queue management system for batch scraping operations.
    """
    
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis_client = None
        self.workers = {}  # worker_id -> worker_task
        self.max_workers = 3
        self.worker_shutdown_event = asyncio.Event()
        
        # Queue keys
        self.pending_queue_key = "scraping:queue:pending"
        self.processing_queue_key = "scraping:queue:processing"
        self.completed_queue_key = "scraping:queue:completed"
        self.task_data_key = "scraping:tasks"
        self.worker_status_key = "scraping:workers"
        
        # Statistics
        self.stats = {
            'tasks_queued': 0,
            'tasks_completed': 0,
            'tasks_failed': 0,
            'total_artists_scraped': 0
        }
    
    async def initialize(self):
        """Initialize Redis connection and start workers."""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            logger.info(f"Connected to Redis at {self.redis_url}")
            
            # Start worker processes
            await self._start_workers()
            
            logger.info(f"Queue manager initialized with {self.max_workers} workers")
        except Exception as e:
            logger.error(f"Failed to initialize queue manager: {str(e)}")
            raise
    
    async def shutdown(self):
        """Shutdown the queue manager and all workers."""
        logger.info("Shutting down queue manager...")
        
        # Signal workers to shutdown
        self.worker_shutdown_event.set()
        
        # Wait for workers to finish
        if self.workers:
            await asyncio.gather(*self.workers.values(), return_exceptions=True)
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Queue manager shutdown complete")
    
    async def add_scraping_task(
        self,
        artist_names: List[str],
        priority: QueuePriority = QueuePriority.NORMAL,
        use_playwright: bool = True,
        max_platforms: int = 6,
        user_id: Optional[str] = None
    ) -> str:
        """
        Add a new scraping task to the queue.
        
        Args:
            artist_names: List of artist names to scrape
            priority: Task priority
            use_playwright: Whether to use Playwright for dynamic scraping
            max_platforms: Maximum platforms to scrape per artist
            user_id: User ID for tracking purposes
            
        Returns:
            Task ID
        """
        task_id = str(uuid.uuid4())
        
        task = ScrapingTask(
            task_id=task_id,
            artist_names=artist_names,
            priority=priority,
            use_playwright=use_playwright,
            max_platforms=max_platforms,
            created_at=datetime.now(),
            user_id=user_id
        )
        
        # Store task data
        await self.redis_client.hset(
            self.task_data_key,
            task_id,
            json.dumps(task.to_dict())
        )
        
        # Add to priority queue
        priority_score = priority.value * 1000 + int(time.time())
        await self.redis_client.zadd(
            self.pending_queue_key,
            {task_id: priority_score}
        )
        
        self.stats['tasks_queued'] += 1
        
        logger.info(f"Added scraping task {task_id} with {len(artist_names)} artists (priority: {priority.name})")
        return task_id
    
    async def get_task_status(self, task_id: str) -> Optional[ScrapingTask]:
        """Get current status of a task."""
        task_data = await self.redis_client.hget(self.task_data_key, task_id)
        if not task_data:
            return None
        
        return ScrapingTask.from_dict(json.loads(task_data))
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get overall queue status and statistics."""
        pending_count = await self.redis_client.zcard(self.pending_queue_key)
        processing_count = await self.redis_client.zcard(self.processing_queue_key)
        
        # Get worker status
        worker_statuses = {}
        for worker_id in self.workers.keys():
            status = await self.redis_client.hget(self.worker_status_key, worker_id)
            worker_statuses[worker_id] = json.loads(status) if status else {"status": "idle"}
        
        return {
            'pending_tasks': pending_count,
            'processing_tasks': processing_count,
            'completed_tasks': self.stats['tasks_completed'],
            'failed_tasks': self.stats['tasks_failed'],
            'total_artists_scraped': self.stats['total_artists_scraped'],
            'workers': worker_statuses,
            'queue_health': 'healthy' if pending_count < 100 else 'overloaded'
        }
    
    async def get_user_tasks(self, user_id: str, limit: int = 50) -> List[ScrapingTask]:
        """Get tasks for a specific user."""
        all_task_data = await self.redis_client.hgetall(self.task_data_key)
        
        user_tasks = []
        for task_id, task_json in all_task_data.items():
            task_data = json.loads(task_json)
            if task_data.get('user_id') == user_id:
                user_tasks.append(ScrapingTask.from_dict(task_data))
        
        # Sort by creation time (newest first)
        user_tasks.sort(key=lambda t: t.created_at, reverse=True)
        return user_tasks[:limit]
    
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending task."""
        # Remove from pending queue
        removed = await self.redis_client.zrem(self.pending_queue_key, task_id)
        
        if removed:
            # Update task status
            await self._update_task_status(task_id, TaskStatus.FAILED, error_message="Task cancelled")
            logger.info(f"Cancelled task {task_id}")
            return True
        
        return False
    
    async def _start_workers(self):
        """Start background worker processes."""
        for i in range(self.max_workers):
            worker_id = f"worker_{i}"
            worker_task = asyncio.create_task(self._worker_process(worker_id))
            self.workers[worker_id] = worker_task
            
            # Initialize worker status
            await self.redis_client.hset(
                self.worker_status_key,
                worker_id,
                json.dumps({"status": "idle", "current_task": None, "started_at": time.time()})
            )
    
    async def _worker_process(self, worker_id: str):
        """Individual worker process for handling scraping tasks."""
        logger.info(f"Worker {worker_id} started")
        
        from .hybrid_scraper import BatchContactScraper
        batch_scraper = BatchContactScraper(max_concurrent=2)
        
        while not self.worker_shutdown_event.is_set():
            try:
                # Get next task from queue
                task_id = await self._get_next_task()
                
                if not task_id:
                    # No tasks available, wait and continue
                    await asyncio.sleep(2)
                    continue
                
                # Update worker status
                await self._update_worker_status(worker_id, "processing", task_id)
                
                # Process the task
                await self._process_task(worker_id, task_id, batch_scraper)
                
                # Update worker status back to idle
                await self._update_worker_status(worker_id, "idle", None)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {str(e)}")
                await self._update_worker_status(worker_id, "error", None)
                await asyncio.sleep(5)  # Wait before retrying
        
        logger.info(f"Worker {worker_id} stopped")
    
    async def _get_next_task(self) -> Optional[str]:
        """Get next task from the priority queue."""
        # Use BZPOPMIN for blocking pop with timeout
        result = await self.redis_client.bzpopmin(self.pending_queue_key, timeout=5)
        
        if result:
            queue_name, task_id, score = result
            
            # Move to processing queue
            await self.redis_client.zadd(
                self.processing_queue_key,
                {task_id: time.time()}
            )
            
            return task_id.decode() if isinstance(task_id, bytes) else task_id
        
        return None
    
    async def _process_task(self, worker_id: str, task_id: str, batch_scraper):
        """Process a single scraping task."""
        try:
            # Get task data
            task_data = await self.redis_client.hget(self.task_data_key, task_id)
            if not task_data:
                logger.error(f"Task {task_id} not found in data store")
                return
            
            task = ScrapingTask.from_dict(json.loads(task_data))
            
            # Update task status to in progress
            await self._update_task_status(task_id, TaskStatus.IN_PROGRESS)
            
            logger.info(f"Worker {worker_id} processing task {task_id} with {len(task.artist_names)} artists")
            
            # Process artists in batches with progress updates
            batch_size = 5  # Process 5 artists at a time
            all_results = []
            
            for i in range(0, len(task.artist_names), batch_size):
                batch_artists = task.artist_names[i:i + batch_size]
                
                # Scrape batch
                batch_results = await batch_scraper.scrape_multiple_artists(
                    batch_artists,
                    use_playwright=task.use_playwright
                )
                
                all_results.extend(batch_results)
                
                # Update progress
                progress = min((i + batch_size) / len(task.artist_names), 1.0)
                await self._update_task_progress(task_id, progress, all_results)
                
                # Small delay between batches
                await asyncio.sleep(1)
            
            # Mark task as completed
            await self._update_task_status(
                task_id, 
                TaskStatus.COMPLETED,
                results=all_results,
                progress=1.0
            )
            
            # Update statistics
            self.stats['tasks_completed'] += 1
            self.stats['total_artists_scraped'] += len(task.artist_names)
            
            # Move to completed queue
            await self.redis_client.zrem(self.processing_queue_key, task_id)
            await self.redis_client.zadd(
                self.completed_queue_key,
                {task_id: time.time()}
            )
            
            success_count = sum(1 for r in all_results if r.success)
            logger.info(f"Task {task_id} completed. Success rate: {success_count}/{len(all_results)}")
            
        except Exception as e:
            logger.error(f"Error processing task {task_id}: {str(e)}")
            
            # Mark task as failed
            await self._update_task_status(
                task_id,
                TaskStatus.FAILED,
                error_message=str(e)
            )
            
            # Remove from processing queue
            await self.redis_client.zrem(self.processing_queue_key, task_id)
            
            self.stats['tasks_failed'] += 1
    
    async def _update_task_status(
        self,
        task_id: str,
        status: TaskStatus,
        progress: float = None,
        results: List[ScrapingResult] = None,
        error_message: str = None
    ):
        """Update task status in Redis."""
        task_data = await self.redis_client.hget(self.task_data_key, task_id)
        if not task_data:
            return
        
        task_dict = json.loads(task_data)
        task_dict['status'] = status.value
        
        if progress is not None:
            task_dict['progress'] = progress
        
        if results is not None:
            task_dict['results'] = [r.dict() if hasattr(r, 'dict') else r.__dict__ for r in results]
        
        if error_message is not None:
            task_dict['error_message'] = error_message
        
        if status == TaskStatus.IN_PROGRESS and not task_dict.get('started_at'):
            task_dict['started_at'] = datetime.now().isoformat()
        
        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            task_dict['completed_at'] = datetime.now().isoformat()
        
        await self.redis_client.hset(
            self.task_data_key,
            task_id,
            json.dumps(task_dict)
        )
    
    async def _update_task_progress(self, task_id: str, progress: float, current_results: List):
        """Update task progress."""
        await self._update_task_status(task_id, TaskStatus.IN_PROGRESS, progress, current_results)
    
    async def _update_worker_status(self, worker_id: str, status: str, current_task: Optional[str]):
        """Update worker status in Redis."""
        worker_status = {
            "status": status,
            "current_task": current_task,
            "last_updated": time.time()
        }
        
        await self.redis_client.hset(
            self.worker_status_key,
            worker_id,
            json.dumps(worker_status)
        )
    
    async def cleanup_old_tasks(self, days_old: int = 7):
        """Clean up completed tasks older than specified days."""
        cutoff_time = time.time() - (days_old * 24 * 60 * 60)
        
        # Remove old completed tasks
        old_completed = await self.redis_client.zrangebyscore(
            self.completed_queue_key, 0, cutoff_time
        )
        
        if old_completed:
            # Remove from completed queue
            await self.redis_client.zremrangebyscore(
                self.completed_queue_key, 0, cutoff_time
            )
            
            # Remove task data
            for task_id in old_completed:
                await self.redis_client.hdel(self.task_data_key, task_id)
            
            logger.info(f"Cleaned up {len(old_completed)} old completed tasks")
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.shutdown()