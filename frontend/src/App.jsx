import React, { useState, useEffect } from 'react'
import { Activity, Zap, AlertTriangle, CheckCircle, Radio, Apple, LayoutDashboard, Bot } from 'lucide-react'
import Header from './components/Header'
import EnvironmentPanel from './components/EnvironmentPanel'
import PowerPanel from './components/PowerPanel'
import TasksPanel from './components/TasksPanel'
import AlertsPanel from './components/AlertsPanel'
import StationStatus from './components/StationStatus'
import NutritionPanel from './components/NutritionPanel'
import AICompanionPanel from './components/AICompanionPanel'
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
    fetchConfig()
    fetchStationStatus()
    fetchTelemetry()
    fetchPower()
    fetchNutrition()
    fetchAlerts()
    fetchTasks()

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
      setTelemetry(data)
    })

    socket.on('power_update', (data) => {
      setPower(data)
    })

    socket.on('alerts_update', (data) => {
      setAlerts(data)
    })

    const interval = setInterval(() => {
      socket.emit('request_update')
      fetchStationStatus()
      fetchNutrition()
      fetchAlerts()
      fetchTasks()
    }, 10000) // Reduced frequency for better performance

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

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length
  const criticalCount = alerts.filter(a => !a.acknowledged && a.level === 'critical').length

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'environment', label: 'Sensors', icon: Radio },
    { id: 'nutrition', label: 'Nutrition', icon: Apple },
    { id: 'power', label: 'Power', icon: Zap },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: unacknowledgedCount, critical: criticalCount > 0 },
    { id: 'ai', label: 'AI', icon: Bot }
  ]

  // Loading state
  if (!config || !stationStatus) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="starfield" />
        <div className="text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
            <Activity className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">ICARUS STATION</h1>
          <p className="text-gray-400">Initializing systems...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-space">
      {/* Starfield background */}
      <div className="starfield" />

      {/* Header */}
      <Header
        stationName={config.station.name}
        missionId={config.station.mission_id}
        connected={connected}
      />

      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Station Status Hero */}
        <StationStatus status={stationStatus} />

        {/* Navigation Tabs */}
        <div className="tab-nav mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn relative flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'active' : ''
                  }`}
              >
                <Icon className={`w-4 h-4 ${tab.critical ? 'text-status-critical animate-bounce' : ''}`} />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`
                    absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-xs 
                    flex items-center justify-center font-bold
                    ${tab.critical ? 'bg-status-critical animate-pulse' : 'bg-status-warning'}
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
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

          {activeTab === 'ai' && (
            <AICompanionPanel />
          )}
        </div>

        {/* System Status Footer */}
        <div className="mt-8 glass-card p-6">
          <h3 className="text-sm font-display font-bold text-white mb-4 uppercase tracking-wider">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['temperature', 'humidity', 'smoke', 'co'].map((sensor) => {
              const status = telemetry?.statuses?.[sensor] || 'unknown'
              const statusColors = {
                nominal: 'text-status-nominal bg-status-nominal/10 border-status-nominal/30',
                warning: 'text-status-warning bg-status-warning/10 border-status-warning/30',
                critical: 'text-status-critical bg-status-critical/10 border-status-critical/30 animate-pulse',
                unknown: 'text-gray-400 bg-gray-500/10 border-gray-500/30'
              }
              const labels = {
                temperature: 'Temperature',
                humidity: 'Humidity',
                smoke: 'Gas (MQ-2)',
                co: 'CO (MQ-7)'
              }
              return (
                <div key={sensor} className={`flex items-center justify-between p-3 rounded-lg border ${statusColors[status]}`}>
                  <span className="text-xs text-gray-400">{labels[sensor]}</span>
                  <span className="text-xs font-bold uppercase">
                    {status === 'nominal' ? 'NOMINAL' : status === 'warning' ? 'WARNING' : status === 'critical' ? 'CRITICAL' : 'N/A'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pb-8 text-center">
          <p className="text-xs text-gray-500">
            ICARUS STATION • Mission Control Interface • {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
