import React, { useState, useEffect } from 'react'
import { Thermometer, Droplets, Gauge, Wind, AlertTriangle, Wifi, WifiOff } from 'lucide-react'

// Sensor card configuration
const SENSOR_CONFIG = {
  temperature: {
    label: 'Temperature',
    icon: Thermometer,
    unit: '°C',
    gradient: 'from-orange-500 to-rose-500',
    bgGlow: 'bg-orange-500/10',
    description: 'DHT22 Sensor'
  },
  humidity: {
    label: 'Humidity',
    icon: Droplets,
    unit: '%',
    gradient: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/10',
    description: 'DHT22 Sensor'
  },
  pressure: {
    label: 'Pressure',
    icon: Gauge,
    unit: 'hPa',
    gradient: 'from-violet-500 to-purple-500',
    bgGlow: 'bg-violet-500/10',
    description: 'BMP280 Sensor'
  },
  smoke: {
    label: 'Smoke/Gas',
    icon: Wind,
    unit: '%',
    gradient: 'from-slate-500 to-gray-600',
    bgGlow: 'bg-slate-500/10',
    description: 'MQ-2 Sensor'
  },
  co: {
    label: 'Carbon Monoxide',
    icon: AlertTriangle,
    unit: '%',
    gradient: 'from-red-500 to-rose-600',
    bgGlow: 'bg-red-500/10',
    description: 'MQ-7 Sensor'
  }
}

// Get status styling
const getStatusStyles = (status) => {
  switch (status) {
    case 'critical':
      return {
        color: 'text-status-critical',
        bg: 'bg-status-critical/10',
        border: 'border-status-critical/50',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
        dot: 'bg-status-critical',
        label: 'CRITICAL'
      }
    case 'warning':
      return {
        color: 'text-status-warning',
        bg: 'bg-status-warning/10',
        border: 'border-status-warning/50',
        glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',
        dot: 'bg-status-warning',
        label: 'WARNING'
      }
    case 'nominal':
      return {
        color: 'text-status-nominal',
        bg: 'bg-status-nominal/10',
        border: 'border-status-nominal/30',
        glow: '',
        dot: 'bg-status-nominal',
        label: 'NORMAL'
      }
    default:
      return {
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        glow: '',
        dot: 'bg-gray-500',
        label: 'N/A'
      }
  }
}

// Sensor Card Component
const SensorCard = ({ sensorKey, value, status, thresholds }) => {
  const config = SENSOR_CONFIG[sensorKey]
  if (!config) return null

  const Icon = config.icon
  const statusStyles = getStatusStyles(status)
  const isCritical = status === 'critical'
  const isWarning = status === 'warning'

  // Calculate progress percentage for threshold bar
  let progress = 50
  if (thresholds && value !== null && value !== undefined) {
    const range = thresholds.max - thresholds.min
    progress = ((value - thresholds.min) / range) * 100
    progress = Math.max(0, Math.min(100, progress))
  }

  return (
    <div className={`
      glass-card glass-card-hover p-5 relative overflow-hidden
      ${isCritical ? `animate-pulse ${statusStyles.glow}` : ''}
      ${isWarning ? statusStyles.glow : ''}
    `}>
      {/* Background glow effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${config.bgGlow} rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2`} />

      <div className="relative z-10">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${config.gradient} shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{config.label}</h3>
              <span className="text-xs text-gray-500">{config.description}</span>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusStyles.bg} border ${statusStyles.border}`}>
            <span className={`w-2 h-2 rounded-full ${statusStyles.dot} ${isCritical ? 'animate-ping' : ''}`} />
            <span className={`text-xs font-medium ${statusStyles.color}`}>
              {statusStyles.label}
            </span>
          </div>
        </div>

        {/* Value display */}
        <div className="text-center py-4">
          <span className={`sensor-value ${statusStyles.color}`}>
            {value !== null && value !== undefined
              ? (typeof value === 'number' ? value.toFixed(1) : value)
              : '--'
            }
          </span>
          <span className="sensor-unit">{config.unit}</span>
        </div>

        {/* Progress bar */}
        {thresholds && (
          <div className="mt-2">
            <div className="progress-bar">
              <div
                className={`progress-fill ${status}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{thresholds.min}{config.unit}</span>
              <span>{thresholds.max}{config.unit}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Environment Panel Component
function EnvironmentPanel({ telemetry, config, detailed }) {
  const [thresholds, setThresholds] = useState(null)

  useEffect(() => {
    fetch('/api/thresholds')
      .then(res => res.json())
      .then(data => setThresholds(data))
      .catch(err => console.error('Failed to fetch thresholds:', err))
  }, [])

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
  const overallStyles = getStatusStyles(overallStatus)

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${overallStyles.bg}`}>
            <Gauge className={`w-6 h-6 ${overallStyles.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Environment Sensors</h2>
            <p className="text-sm text-gray-400">Real-time sensor data from Arduino</p>
          </div>
        </div>

        {/* Connection status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${telemetry ? 'bg-status-nominal/10 border border-status-nominal/30' : 'bg-status-critical/10 border border-status-critical/30'
          }`}>
          {telemetry ? (
            <>
              <Wifi className="w-4 h-4 text-status-nominal" />
              <span className="text-sm text-status-nominal font-medium">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-status-critical" />
              <span className="text-sm text-status-critical font-medium">No Data</span>
            </>
          )}
        </div>
      </div>

      {/* Sensor Grid */}
      <div className={`grid gap-4 stagger-children ${detailed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 lg:grid-cols-3'
        }`}>
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
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <span className="text-xs text-gray-500 font-mono">
            Last update: {new Date(telemetry.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}

export default EnvironmentPanel
