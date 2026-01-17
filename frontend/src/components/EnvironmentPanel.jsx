import React, { useState, useEffect } from 'react'
import { Thermometer, Droplets, Gauge, Wind, AlertTriangle, Wifi, WifiOff } from 'lucide-react'

// Sensor card configuration
const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    unit: '°C',
    color: 'orange',
    gradient: 'from-orange-500 to-red-500',
    description: 'DHT22'
  },
  humidity: {
    label: 'Humidity',
    icon: Droplets,
    unit: '%',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    description: 'DHT22'
  },
  pressure: {
    label: 'Pressure',
    icon: Gauge,
    unit: 'hPa',
    color: 'purple',
    gradient: 'from-purple-500 to-indigo-500',
    description: 'BMP280'
  },
  smoke: {
    label: 'Smoke/Gas',
    icon: Wind,
    unit: '%',
    color: 'gray',
    gradient: 'from-gray-500 to-slate-600',
    description: 'MQ-2'
  },
  co: {
    label: 'CO (Carbon Monoxide)',
    icon: AlertTriangle,
    unit: '%',
    color: 'red',
    gradient: 'from-red-500 to-rose-600',
    description: 'MQ-7'
  }
}

// Get status color based on threshold
const getStatusColor = (status) => {
  switch (status) {
    case 'critical':
      return 'bg-red-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'nominal':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

// Get status text
const getStatusText = (status) => {
  switch (status) {
    case 'critical':
      return 'DANGER'
    case 'warning':
      return 'WARNING'
    case 'nominal':
      return 'NORMAL'
    default:
      return 'N/A'
  }
}

// Get border color based on status
const getBorderColor = (status) => {
  switch (status) {
    case 'critical':
      return 'border-red-500 shadow-red-500/30'
    case 'warning':
      return 'border-yellow-500 shadow-yellow-500/30'
    case 'nominal':
      return 'border-green-500/30'
    default:
      return 'border-gray-700'
  }
}

// Sensor Card Component
const SensorCard = ({ sensorKey, value, status, thresholds }) => {
  const config = SENSOR_CONFIG[sensorKey]
  if (!config) return null

  const Icon = config.icon
  const isCritical = status === 'critical'
  const isWarning = status === 'warning'

  return (
    <div className={`
      relative overflow-hidden rounded-xl border-2 p-4
      bg-gradient-to-br from-gray-900/90 to-gray-800/90
      backdrop-blur-sm transition-all duration-300
      ${getBorderColor(status)}
      ${isCritical ? 'animate-pulse shadow-lg' : ''}
      ${isWarning ? 'shadow-md' : ''}
    `}>
      {/* Status indicator */}
      <div className={`absolute top-3 right-3 flex items-center gap-2`}>
        <span className={`text-xs font-bold px-2 py-1 rounded ${isCritical ? 'bg-red-500/20 text-red-400' :
            isWarning ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
          }`}>
          {getStatusText(status)}
        </span>
        <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} ${isCritical ? 'animate-ping' : ''}`} />
      </div>

      {/* Icon and label */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${config.gradient}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{config.label}</h3>
          <span className="text-xs text-gray-400">{config.description}</span>
        </div>
      </div>

      {/* Value */}
      <div className="text-center py-4">
        <span className={`text-4xl font-bold ${isCritical ? 'text-red-400' :
            isWarning ? 'text-yellow-400' :
              'text-white'
          }`}>
          {value !== null && value !== undefined ?
            (typeof value === 'number' ? value.toFixed(1) : value) :
            '--'
          }
        </span>
        <span className="text-xl text-gray-400 ml-2">{config.unit}</span>
      </div>

      {/* Threshold info */}
      {thresholds && (
        <div className="mt-2 pt-3 border-t border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Normal: {thresholds.min} - {thresholds.max}{config.unit}</span>
            <span className={isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'}>
              ● {status}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Environment Panel Component
function EnvironmentPanel({ telemetry, config, detailed }) {
  const [thresholds, setThresholds] = useState(null)

  useEffect(() => {
    // Fetch thresholds from API
    fetch('/api/thresholds')
      .then(res => res.json())
      .then(data => setThresholds(data))
      .catch(err => console.error('Failed to fetch thresholds:', err))
  }, [])

  // Get status from telemetry or calculate
  const getStatus = (key, value) => {
    if (telemetry?.statuses?.[key]) {
      return telemetry.statuses[key]
    }

    if (!thresholds?.[key] || value === null || value === undefined) {
      return 'unknown'
    }

    const t = thresholds[key]
    if (key === 'smoke' || key === 'co') {
      if (value >= t.critical_max) return 'critical'
      if (value >= t.max) return 'warning'
      return 'nominal'
    } else {
      if (value <= t.critical_min || value >= t.critical_max) return 'critical'
      if (value <= t.min || value >= t.max) return 'warning'
      return 'nominal'
    }
  }

  // Get overall environment status
  const getOverallStatus = () => {
    if (!telemetry) return 'unknown'

    let hasCritical = false
    let hasWarning = false

    Object.keys(SENSOR_CONFIG).forEach(key => {
      const status = getStatus(key, telemetry[key])
      if (status === 'critical') hasCritical = true
      if (status === 'warning') hasWarning = true
    })

    if (hasCritical) return 'critical'
    if (hasWarning) return 'warning'
    return 'nominal'
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${overallStatus === 'critical' ? 'bg-red-500/20' :
              overallStatus === 'warning' ? 'bg-yellow-500/20' :
                'bg-green-500/20'
            }`}>
            <Gauge className={`w-6 h-6 ${overallStatus === 'critical' ? 'text-red-400' :
                overallStatus === 'warning' ? 'text-yellow-400' :
                  'text-green-400'
              }`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Environment Sensors</h2>
            <p className="text-sm text-gray-400">Real-time data from Arduino</p>
          </div>
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${telemetry ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
          {telemetry ? (
            <>
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Arduino Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">No Data</span>
            </>
          )}
        </div>
      </div>

      {/* Sensor Grid */}
      <div className={`grid gap-4 ${detailed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {Object.keys(SENSOR_CONFIG).map(key => (
          <SensorCard
            key={key}
            sensorKey={key}
            value={telemetry?.[key]}
            status={getStatus(key, telemetry?.[key])}
            thresholds={thresholds?.[key]}
          />
        ))}
      </div>

      {/* Last update */}
      {telemetry?.timestamp && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
          <span className="text-xs text-gray-500">
            Last update: {new Date(telemetry.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}

export default EnvironmentPanel
