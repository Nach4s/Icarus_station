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

// Backend URL configuration
const API_URL = 'http://localhost:5000'

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
    const socket = io(API_URL)

    socket.on('connect', () => {
      setConnected(true)
      console.log('Connected to Icarus Station')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      console.log('Disconnected from Icarus Station')
    })

    socket.on('telemetry_update', (data) => {
      console.log('Telemetry update:', data)
      setTelemetry(data)
    })

    socket.on('power_update', (data) => {
      setPower(data)
    })

    socket.on('alerts_update', (data) => {
      console.log('Alerts update:', data)
      setAlerts(data)
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
      const response = await fetch(`${API_URL}/api/config`)
      const data = await response.json()
      setConfig(data)
    } catch (error) {
      console.error('Error fetching config:', error)
    }
  }

  const fetchStationStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/station/status`)
      const data = await response.json()
      setStationStatus(data)
    } catch (error) {
      console.error('Error fetching station status:', error)
    }
  }

  const fetchTelemetry = async () => {
    try {
      const response = await fetch(`${API_URL}/api/telemetry`)
      const data = await response.json()
      setTelemetry(data)
    } catch (error) {
      console.error('Error fetching telemetry:', error)
    }
  }

  const fetchPower = async () => {
    try {
      const response = await fetch(`${API_URL}/api/power`)
      const data = await response.json()
      setPower(data)
    } catch (error) {
      console.error('Error fetching power:', error)
    }
  }

  const fetchNutrition = async () => {
    try {
      const response = await fetch(`${API_URL}/api/nutrition`)
      const data = await response.json()
      const normalizedNutrition = {
        ...data,
        nutrition: data.nutrition ?? data,
        requirements: data.requirements ?? null
      }
      setNutrition(normalizedNutrition)
    } catch (error) {
      console.error('Error fetching nutrition:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/alerts`)
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`)
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`${API_URL}/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const clearAcknowledgedAlerts = async () => {
    try {
      await fetch(`${API_URL}/api/alerts/clear`, { method: 'POST' })
      fetchAlerts()
    } catch (error) {
      console.error('Error clearing alerts:', error)
    }
  }

  const updateTask = async (taskId, updates) => {
    try {
      await fetch(`${API_URL}/api/tasks/${taskId}`, {
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
      await fetch(`${API_URL}/api/tasks`, {
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
      await fetch(`${API_URL}/api/tasks/${taskId}`, { method: 'DELETE' })
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Count unacknowledged alerts for tab badge
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length
  const criticalCount = alerts.filter(a => !a.acknowledged && a.level === 'critical').length

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
        <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'overview'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Activity className="inline w-5 h-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'environment'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Radio className="inline w-5 h-5 mr-2" />
            Sensors
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'nutrition'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Apple className="inline w-5 h-5 mr-2" />
            Nutrition
          </button>
          <button
            onClick={() => setActiveTab('power')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'power'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <Zap className="inline w-5 h-5 mr-2" />
            Power
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === 'tasks'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <CheckCircle className="inline w-5 h-5 mr-2" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'alerts'
                ? 'text-space-cyan border-b-2 border-space-cyan'
                : 'text-gray-400 hover:text-gray-200'
              }`}
          >
            <AlertTriangle className={`inline w-5 h-5 mr-2 ${criticalCount > 0 ? 'text-red-400 animate-bounce' : ''}`} />
            Alerts
            {unacknowledgedCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'
                }`}>
                {unacknowledgedCount}
              </span>
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
            <AlertsPanel
              alerts={alerts}
              onAcknowledge={acknowledgeAlert}
              onClearAcknowledged={clearAcknowledgedAlerts}
            />
          )}
        </div>

        {/* System Status Summary Footer */}
        <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Temperature:</span>
              <span className={`text-sm font-bold ${telemetry?.statuses?.temperature === 'nominal' ? 'text-green-400' :
                  telemetry?.statuses?.temperature === 'warning' ? 'text-yellow-400' :
                    telemetry?.statuses?.temperature === 'critical' ? 'text-red-400' : 'text-gray-400'
                }`}>
                {telemetry?.statuses?.temperature === 'nominal' ? 'NOMINAL' :
                  telemetry?.statuses?.temperature === 'warning' ? 'WARNING' :
                    telemetry?.statuses?.temperature === 'critical' ? 'CRITICAL' : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Humidity:</span>
              <span className={`text-sm font-bold ${telemetry?.statuses?.humidity === 'nominal' ? 'text-green-400' :
                  telemetry?.statuses?.humidity === 'warning' ? 'text-yellow-400' :
                    telemetry?.statuses?.humidity === 'critical' ? 'text-red-400' : 'text-gray-400'
                }`}>
                {telemetry?.statuses?.humidity === 'nominal' ? 'NOMINAL' :
                  telemetry?.statuses?.humidity === 'warning' ? 'WARNING' :
                    telemetry?.statuses?.humidity === 'critical' ? 'CRITICAL' : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">Gas (MQ-2):</span>
              <span className={`text-sm font-bold ${telemetry?.statuses?.smoke === 'nominal' ? 'text-green-400' :
                  telemetry?.statuses?.smoke === 'warning' ? 'text-yellow-400' :
                    telemetry?.statuses?.smoke === 'critical' ? 'text-red-400' : 'text-gray-400'
                }`}>
                {telemetry?.statuses?.smoke === 'nominal' ? 'NOMINAL' :
                  telemetry?.statuses?.smoke === 'warning' ? 'WARNING' :
                    telemetry?.statuses?.smoke === 'critical' ? 'CRITICAL' : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
              <span className="text-sm text-gray-400">CO (MQ-7):</span>
              <span className={`text-sm font-bold ${telemetry?.statuses?.co === 'nominal' ? 'text-green-400' :
                  telemetry?.statuses?.co === 'warning' ? 'text-yellow-400' :
                    telemetry?.statuses?.co === 'critical' ? 'text-red-400' : 'text-gray-400'
                }`}>
                {telemetry?.statuses?.co === 'nominal' ? 'NOMINAL' :
                  telemetry?.statuses?.co === 'warning' ? 'WARNING' :
                    telemetry?.statuses?.co === 'critical' ? 'CRITICAL' : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
