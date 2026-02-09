import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, Play, Pause, Trash2, Plus, ListTodo, Timer } from 'lucide-react'

const TasksPanel = ({ tasks, config, onUpdate, onCreate, onDelete }) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    category: 'Maintenance',
    priority: 'Medium',
    duration: 60
  })
  const [taskTimers, setTaskTimers] = useState({})

  // Timer effect for in-progress tasks
  useEffect(() => {
    const interval = setInterval(() => {
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
      if (inProgressTasks.length > 0) {
        setTaskTimers(prev => {
          const updated = { ...prev }
          inProgressTasks.forEach(task => {
            if (!updated[task.id]) {
              updated[task.id] = { startTime: Date.now(), elapsed: 0 }
            } else {
              updated[task.id].elapsed = Math.floor((Date.now() - updated[task.id].startTime) / 1000)
            }
          })
          return updated
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [tasks])

  // Reset timer when task starts
  const handleStartTask = (taskId) => {
    setTaskTimers(prev => ({
      ...prev,
      [taskId]: { startTime: Date.now(), elapsed: 0 }
    }))
    onUpdate(taskId, { status: 'in_progress' })
  }

  const handleCreateTask = () => {
    if (newTask.name.trim()) {
      onCreate(newTask)
      setNewTask({
        name: '',
        category: 'Maintenance',
        priority: 'Medium',
        duration: 60
      })
      setShowCreateForm(false)
    }
  }

  const getPriorityStyles = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'text-status-critical bg-status-critical/10 border-status-critical/30'
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
      case 'medium':
        return 'text-status-warning bg-status-warning/10 border-status-warning/30'
      case 'low':
        return 'text-status-nominal bg-status-nominal/10 border-status-nominal/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const groupedTasks = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  }

  const TaskCard = ({ task }) => {
    const timer = taskTimers[task.id]
    const elapsedSeconds = timer?.elapsed || 0
    const totalSeconds = task.duration * 60
    const progress = Math.min(100, (elapsedSeconds / totalSeconds) * 100)
    const isOvertime = elapsedSeconds > totalSeconds

    return (
      <div className="glass-card glass-card-hover p-4">
        <div className="flex items-start justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">{task.name}</h4>
          <button
            onClick={() => onDelete(task.id)}
            className="text-gray-500 hover:text-status-critical transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityStyles(task.priority)}`}>
            {task.priority}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">
            {task.category}
          </span>
        </div>

        <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{(task.duration / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })} h</span>
        </div>

        {/* Timer Progress Bar for In-Progress Tasks */}
        {task.status === 'in_progress' && timer && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Timer className={`w-3.5 h-3.5 ${isOvertime ? 'text-status-critical' : 'text-primary'} animate-pulse`} />
                <span className={`text-sm font-mono font-bold ${isOvertime ? 'text-status-critical' : 'text-primary'}`}>
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                / {formatTime(totalSeconds)}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${isOvertime
                    ? 'bg-gradient-to-r from-status-critical to-red-400 animate-pulse'
                    : 'bg-gradient-to-r from-primary to-cyan-400'
                  }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            {isOvertime && (
              <div className="text-xs text-status-critical font-medium text-center animate-pulse">
                ⚠️ Overtime: +{formatTime(elapsedSeconds - totalSeconds)}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {task.status === 'pending' && (
            <button
              onClick={() => handleStartTask(task.id)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 
                         text-primary text-xs rounded-lg transition-colors border border-primary/30"
            >
              <Play className="w-3 h-3" /> Start
            </button>
          )}
          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => onUpdate(task.id, { status: 'completed' })}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-status-nominal/20 hover:bg-status-nominal/30 
                           text-status-nominal text-xs rounded-lg transition-colors border border-status-nominal/30"
              >
                <CheckCircle className="w-3 h-3" /> Done
              </button>
              <button
                onClick={() => onUpdate(task.id, { status: 'pending' })}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 
                           text-gray-400 text-xs rounded-lg transition-colors border border-white/10"
              >
                <Pause className="w-3 h-3" /> Pause
              </button>
            </>
          )}
          {task.status === 'completed' && (
            <div className="flex-1 text-center text-xs text-status-nominal py-1.5">
              ✓ Completed
            </div>
          )}
        </div>
      </div>
    )
  }

  const TaskColumn = ({ title, icon: Icon, iconColor, tasks: columnTasks }) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title} ({columnTasks.length})
      </h3>
      <div className="space-y-3">
        {columnTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
        {columnTasks.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ListTodo className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Task Management</h2>
            <p className="text-sm text-gray-400">{tasks.length} total tasks</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="glass-card p-4 mb-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-4">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Task Name</label>
              <input
                type="text"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                           focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Enter task name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                           focus:outline-none focus:border-primary/50 transition-colors"
              >
                {config.tasks.categories.map(cat => (
                  <option key={cat} value={cat} className="bg-space-dark">{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                           focus:outline-none focus:border-primary/50 transition-colors"
              >
                {config.tasks.priorities.map(pri => (
                  <option key={pri} value={pri} className="bg-space-dark">{pri}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={newTask.duration / 60}
                onChange={(e) => setNewTask({ ...newTask, duration: Math.max(0, parseFloat(e.target.value || 0)) * 60 })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                           focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreateTask} className="btn-primary text-sm">
              Create Task
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskColumn
          title="Pending"
          icon={Clock}
          iconColor="text-gray-400"
          tasks={groupedTasks.pending}
        />
        <TaskColumn
          title="In Progress"
          icon={Play}
          iconColor="text-primary"
          tasks={groupedTasks.in_progress}
        />
        <TaskColumn
          title="Completed"
          icon={CheckCircle}
          iconColor="text-status-nominal"
          tasks={groupedTasks.completed}
        />
      </div>
    </div>
  )
}

export default TasksPanel
