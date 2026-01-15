import React, { useState, useEffect } from 'react'
import { Activity, Zap, AlertTriangle, CheckCircle, Radio, Apple } from 'lucide-react'
import Header from './components/Header'
import EnvironmentPanel from './components/EnvironmentPanel'
import PowerPanel from './components/PowerPanel'
import TasksPanel from './components/TasksPanel'
import AlertsPanel from './components/AlertsPanel'
import StationStatus from './components/StationStatus'
import NutritionPanel from './components/NutritionPanel'
import { io } from 'socket.io-client'

function App() {
  const [stationStatus, setStationStatus] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [power, setPower] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [tasks, setTasks] = useState([])
  const [config, setConfig] = useState(null)
  const [connected, setConnected] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Fetch initial data
    fetchConfig()
    fetchStationStatus()
    fetchTelemetry()
    fetchPower()
    fetchNutrition()
    fetchAlerts()
    fetchTasks()

    // Setup WebSocket connection
    const socket = io('http://localhost:5000')
    
    socket.on('connect', () => {
      setConnected(true)
      console.log('Connected to Icarus Station')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      console.log('Disconnected from Icarus Station')
    })

    socket.on('telemetry_update', (data) => {
      setTelemetry(data)
    })

    socket.on('power_update', (data) => {
      setPower(data)
    })

    // Request updates every 5 seconds
    const interval = setInterval(() => {
      socket.emit('request_update')
      fetchStationStatus()
      fetchNutrition()
      fetchAlerts()
      fetchTasks()
    }, 5000)

    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config')
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  const fetchStationStatus = async () => {
    try {
      const response = await fetch('/api/station/status')
      const data = await response.json()
      setStationStatus(data)
    } catch (error) {
      console.error('Error fetching station status:', error)
    }
  }

  const fetchTelemetry = async () => {
    try {
      const response = await fetch('/api/telemetry')
      const data = await response.json()
      setTelemetry(data)
    } catch (error) {
      console.error('Error fetching telemetry:', error)
    }
  }

  const fetchPower = async () => {
    try {
      const response = await fetch('/api/power')
      const data = await response.json()
      setPower(data)
    } catch (error) {
      console.error('Error fetching power:', error)
    }
  }

  const fetchNutrition = async () => {
    try {
      const response = await fetch('/api/nutrition')
      const data = await response.json()
      console.log('Nutrition API raw response:', data)
      
      // Normalize the data structure
      const normalizedNutrition = {
        ...data,
        nutrition: data.nutrition ?? data,
        requirements: data.requirements ?? null
      }
      
      console.log('Normalized nutrition data:', normalizedNutrition)
      setNutrition(normalizedNutrition)
    } catch (error) {
      console.error('Error fetching nutrition:', error)
      // Set mock data for testing
      setNutrition({
        requirements: {
          calories: { optimal: 2500, current: 2380, unit: 'kcal', warning_threshold: 200 },
          protein: { optimal: 100, current: 85, unit: 'g', warning_threshold: 15 },
          water: { optimal: 2.0, current: 1.6, unit: 'L', warning_threshold: 0.3 },
          vitamins: { optimal: 100, current: 92, unit: '%', warning_threshold: 10 }
        },
        meal_schedule: [
          { time: '07:30', meal: 'Breakfast', menu: 'Quail egg omelet', icon: '🍳' }
        ],
        last_check: '2 days ago'
      })
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const createTask = async (taskData) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const deleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  if (!config || !stationStatus) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-space-cyan animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-300">Initializing Icarus Station...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-space-dark">
      <Header 
        stationName={config.station.name}
        missionId={config.station.mission_id}
        connected={connected}
      />

      <main className="container mx-auto px-4 py-6">
        {/* Station Status Overview */}
        <StationStatus status={stationStatus} />

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="inline w-5 h-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'environment'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="inline w-5 h-5 mr-2" />
            Environment
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'nutrition'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Apple className="inline w-5 h-5 mr-2" />
            Nutrition
          </button>
          <button
            onClick={() => setActiveTab('power')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'power'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="inline w-5 h-5 mr-2" />
            Power
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <CheckCircle className="inline w-5 h-5 mr-2" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === 'alerts'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <AlertTriangle className="inline w-5 h-5 mr-2" />
            Alerts
            {alerts.filter(a => !a.acknowledged).length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-nasa-red rounded-full animate-pulse-glow"></span>
            )}
          </button>
        </div>

        {/* Content Panels */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EnvironmentPanel telemetry={telemetry} config={config} />
              <PowerPanel power={power} config={config} />
              <div className="lg:col-span-2">
                <AlertsPanel 
                  alerts={alerts.slice(-5)} 
                  onAcknowledge={acknowledgeAlert}
                  compact={true}
                />
              </div>
            </div>
          )}

          {activeTab === 'environment' && (
            <EnvironmentPanel telemetry={telemetry} config={config} detailed={true} />
          )}

          {activeTab === 'nutrition' && (
            <NutritionPanel nutrition={nutrition} config={config} />
          )}

          {activeTab === 'power' && (
            <PowerPanel power={power} config={config} detailed={true} />
          )}

          {activeTab === 'tasks' && (
            <TasksPanel 
              tasks={tasks}
              config={config}
              onUpdate={updateTask}
              onCreate={createTask}
              onDelete={deleteTask}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
          )}
        </div>

        {/* System Status Summary Footer */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">System Status Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Oxygen Systems:</span>
              <span className={`text-sm font-bold ${
                telemetry && telemetry.oxygen >= 19.5 && telemetry.oxygen <= 23.5 
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {telemetry && telemetry.oxygen >= 19.5 && telemetry.oxygen <= 23.5 ? 'NOMINAL' : 'ATTENTION'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Temperature Control:</span>
              <span className={`text-sm font-bold ${
                telemetry && telemetry.temperature >= 18 && telemetry.temperature <= 24 
                  ? 'text-green-400' : 'text-red-400'
              }`}>
                {telemetry && telemetry.temperature >= 18 && telemetry.temperature <= 24 ? 'NOMINAL' : 'ATTENTION'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Nutrient Balance:</span>
              <span className={`text-sm font-bold ${
                nutrition && nutrition.requirements && 
                nutrition.requirements.calories.current >= nutrition.requirements.calories.optimal - 200 &&
                nutrition.requirements.protein.current >= nutrition.requirements.protein.optimal - 15
                  ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {nutrition && nutrition.requirements && 
                nutrition.requirements.calories.current >= nutrition.requirements.calories.optimal - 200 &&
                nutrition.requirements.protein.current >= nutrition.requirements.protein.optimal - 15
                  ? 'NOMINAL' : 'ATTENTION'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
