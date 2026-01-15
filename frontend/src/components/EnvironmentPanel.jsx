import React from 'react'
import { Thermometer, Wind, Droplets, AlertCircle, Activity } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const EnvironmentPanel = ({ telemetry, config, detailed = false }) => {
  if (!telemetry || !config) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400">Loading environment data...</p>
      </div>
    )
  }

  const envConfig = config.environment

  const getStatusColor = (value, optimal, threshold) => {
    const diff = Math.abs(value - optimal)
    if (diff > threshold * 1.5) return 'text-red-400'
    if (diff > threshold) return 'text-yellow-400'
    return 'text-green-400'
  }

  const parameters = [
    {
      name: 'Temperature',
      icon: Thermometer,
      value: telemetry.temperature,
      unit: envConfig.temperature.unit,
      optimal: envConfig.temperature.optimal,
      threshold: envConfig.temperature.alert_threshold,
      min: envConfig.temperature.min,
      max: envConfig.temperature.max
    },
    {
      name: 'Oxygen',
      icon: Wind,
      value: telemetry.oxygen,
      unit: envConfig.oxygen.unit,
      optimal: envConfig.oxygen.optimal,
      threshold: envConfig.oxygen.alert_threshold,
      min: envConfig.oxygen.min,
      max: envConfig.oxygen.max
    },
    {
      name: 'CO₂',
      icon: Activity,
      value: telemetry.co2,
      unit: envConfig.co2.unit,
      optimal: envConfig.co2.optimal,
      threshold: envConfig.co2.alert_threshold,
      min: envConfig.co2.min,
      max: envConfig.co2.max
    },
    {
      name: 'Humidity',
      icon: Droplets,
      value: telemetry.humidity,
      unit: envConfig.humidity.unit,
      optimal: envConfig.humidity.optimal,
      threshold: envConfig.humidity.alert_threshold,
      min: envConfig.humidity.min,
      max: envConfig.humidity.max
    },
    {
      name: 'CO',
      icon: AlertCircle,
      value: telemetry.co,
      unit: envConfig.co.unit,
      optimal: envConfig.co.optimal,
      threshold: envConfig.co.alert_threshold,
      min: envConfig.co.min,
      max: envConfig.co.max
    }
  ]

  // Calculate overall environment status
  const getOverallStatus = () => {
    let hasWarning = false
    let hasCritical = false
    
    parameters.forEach(param => {
      const diff = Math.abs(param.value - param.optimal)
      if (diff > param.threshold * 1.5) hasCritical = true
      else if (diff > param.threshold) hasWarning = true
    })
    
    if (hasCritical) return { status: 'CRITICAL', color: 'bg-red-900/50 border-red-500 text-red-400' }
    if (hasWarning) return { status: 'ALERT', color: 'bg-yellow-900/50 border-yellow-500 text-yellow-400' }
    return { status: 'NOMINAL', color: 'bg-green-900/50 border-green-500 text-green-400' }
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Activity className="w-6 h-6 text-space-cyan" />
        Environment Control
      </h2>

      {/* Large Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border-2 ${overallStatus.color}`}>
        <div className="text-center">
          <p className="text-sm uppercase tracking-wider mb-1">Environment Status</p>
          <p className="text-3xl font-bold">{overallStatus.status}</p>
        </div>
      </div>

      <div className={`grid ${detailed ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
        {parameters.map((param) => {
          const Icon = param.icon
          const statusColor = getStatusColor(param.value, param.optimal, param.threshold)
          const percentage = ((param.value - param.min) / (param.max - param.min)) * 100

          return (
            <div key={param.name} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-space-cyan" />
                  <span className="text-sm font-medium text-gray-300">{param.name}</span>
                </div>
                <span className={`text-xs font-mono ${statusColor}`}>
                  {param.value}{param.unit}
                </span>
              </div>

              <div className="mb-2">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      statusColor.includes('red') ? 'bg-red-500' :
                      statusColor.includes('yellow') ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs text-gray-500">
                <span>{param.min}{param.unit}</span>
                <span className="text-gray-400">Optimal: {param.optimal}{param.unit}</span>
                <span>{param.max}{param.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      {detailed && (
        <div className="mt-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 mb-2">Life Support Systems:</p>
              <ul className="space-y-1 text-green-400">
                <li>✓ Oxygen Generation: NOMINAL</li>
                <li>✓ CO₂ Scrubbers: NOMINAL</li>
                <li>✓ Temperature Control: NOMINAL</li>
              </ul>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Last Maintenance:</p>
              <ul className="space-y-1 text-gray-300">
                <li>Air Filters: 2 days ago</li>
                <li>HVAC System: 5 days ago</li>
                <li>Sensors Calibration: 7 days ago</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnvironmentPanel
