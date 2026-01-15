import React, { useState } from 'react'
import { CheckCircle, Clock, Play, Pause, Trash2, Plus } from 'lucide-react'

const TasksPanel = ({ tasks, config, onUpdate, onCreate, onDelete }) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    category: 'Maintenance',
    priority: 'Medium',
    duration: 60
  })

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

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-900/30 border-red-500'
      case 'high':
        return 'text-orange-400 bg-orange-900/30 border-orange-500'
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500'
      case 'low':
        return 'text-green-400 bg-green-900/30 border-green-500'
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-500'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'in_progress':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const groupedTasks = {
    pending: tasks.filter(t => t.status === 'pending'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed')
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-space-cyan" />
          Task Management
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-space-cyan hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700 animate-slide-in">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Task</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Task Name</label>
              <input
                type="text"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-space-cyan"
                placeholder="Enter task name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-space-cyan"
              >
                {config.tasks.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-space-cyan"
              >
                {config.tasks.priorities.map(pri => (
                  <option key={pri} value={pri}>{pri}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={newTask.duration}
                onChange={(e) => setNewTask({ ...newTask, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-space-cyan"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Create Task
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Pending ({groupedTasks.pending.length})
          </h3>
          <div className="space-y-3">
            {groupedTasks.pending.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            ))}
            {groupedTasks.pending.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No pending tasks</p>
            )}
          </div>
        </div>

        {/* In Progress Tasks */}
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            In Progress ({groupedTasks.in_progress.length})
          </h3>
          <div className="space-y-3">
            {groupedTasks.in_progress.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            ))}
            {groupedTasks.in_progress.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No tasks in progress</p>
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Completed ({groupedTasks.completed.length})
          </h3>
          <div className="space-y-3">
            {groupedTasks.completed.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onUpdate}
                onDelete={onDelete}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            ))}
            {groupedTasks.completed.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No completed tasks</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const TaskCard = ({ task, onUpdate, onDelete, getPriorityColor, getStatusColor }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{task.name}</h4>
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
          {task.category}
        </span>
      </div>

      <div className="text-xs text-gray-400 mb-3">
        <p>Duration: {task.duration} min</p>
      </div>

      <div className="flex gap-2">
        {task.status === 'pending' && (
          <button
            onClick={() => onUpdate(task.id, { status: 'in_progress' })}
            className="flex-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            Start
          </button>
        )}
        {task.status === 'in_progress' && (
          <>
            <button
              onClick={() => onUpdate(task.id, { status: 'completed' })}
              className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
            >
              Complete
            </button>
            <button
              onClick={() => onUpdate(task.id, { status: 'pending' })}
              className="flex-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors"
            >
              Pause
            </button>
          </>
        )}
        {task.status === 'completed' && (
          <div className="flex-1 text-center text-xs text-green-400 py-1">
            ✓ Completed
          </div>
        )}
      </div>
    </div>
  )
}

export default TasksPanel
