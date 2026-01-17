import React from 'react'
import { AlertTriangle, AlertCircle, CheckCircle, Bell, BellOff, Clock, X, Trash2 } from 'lucide-react'

// Get alert icon based on level
const getAlertIcon = (level) => {
  switch (level) {
    case 'critical':
      return AlertTriangle
    case 'warning':
      return AlertCircle
    default:
      return Bell
  }
}

// Get alert colors based on level
const getAlertColors = (level, acknowledged) => {
  if (acknowledged) {
    return {
      bg: 'bg-gray-800/50',
      border: 'border-gray-600',
      icon: 'text-gray-400',
      text: 'text-gray-400'
    }
  }

  switch (level) {
    case 'critical':
      return {
        bg: 'bg-red-900/30',
        border: 'border-red-500',
        icon: 'text-red-400',
        text: 'text-red-300',
        glow: 'shadow-red-500/20'
      }
    case 'warning':
      return {
        bg: 'bg-yellow-900/30',
        border: 'border-yellow-500',
        icon: 'text-yellow-400',
        text: 'text-yellow-300',
        glow: 'shadow-yellow-500/20'
      }
    default:
      return {
        bg: 'bg-blue-900/30',
        border: 'border-blue-500',
        icon: 'text-blue-400',
        text: 'text-blue-300',
        glow: 'shadow-blue-500/20'
      }
  }
}

// Format parameter name
const formatParameter = (param) => {
  const names = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    pressure: 'Pressure',
    smoke: 'Smoke/Gas (MQ-2)',
    co: 'CO (MQ-7)'
  }
  return names[param] || param
}

// Single Alert Item Component
const AlertItem = ({ alert, onAcknowledge, compact }) => {
  const Icon = getAlertIcon(alert.level)
  const colors = getAlertColors(alert.level, alert.acknowledged)
  const isCritical = alert.level === 'critical' && !alert.acknowledged

  return (
    <div className={`
      relative overflow-hidden rounded-lg border-l-4 p-4
      ${colors.bg} ${colors.border} ${colors.glow || ''}
      ${isCritical ? 'animate-pulse shadow-lg' : ''}
      transition-all duration-300
    `}>
      {/* Critical badge */}
      {isCritical && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-bl">
          DANGER
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${alert.level === 'critical' ? 'bg-red-500/20' :
            alert.level === 'warning' ? 'bg-yellow-500/20' :
              'bg-blue-500/20'
          }`}>
          <Icon className={`w-6 h-6 ${colors.icon} ${isCritical ? 'animate-bounce' : ''}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-bold ${colors.text}`}>
              {formatParameter(alert.parameter)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${alert.level === 'critical' ? 'bg-red-500/30 text-red-300' :
                alert.level === 'warning' ? 'bg-yellow-500/30 text-yellow-300' :
                  'bg-blue-500/30 text-blue-300'
              }`}>
              {alert.level === 'critical' ? 'CRITICAL' :
                alert.level === 'warning' ? 'WARNING' : 'INFO'}
            </span>
            {alert.acknowledged && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                Acknowledged
              </span>
            )}
          </div>

          {/* Message */}
          <p className={`text-sm ${alert.acknowledged ? 'text-gray-500' : 'text-gray-300'}`}>
            {alert.message}
          </p>

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{new Date(alert.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* Acknowledge button */}
        {!alert.acknowledged && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="flex-shrink-0 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 
                       transition-colors text-gray-300 hover:text-white"
            title="Acknowledge"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Main Alerts Panel Component
function AlertsPanel({ alerts = [], onAcknowledge, compact, onClearAcknowledged }) {
  // Separate alerts by status
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged)

  // Count by level
  const criticalCount = unacknowledgedAlerts.filter(a => a.level === 'critical').length
  const warningCount = unacknowledgedAlerts.filter(a => a.level === 'warning').length

  // Sort: critical first, then by timestamp
  const sortedAlerts = [...unacknowledgedAlerts, ...acknowledgedAlerts].sort((a, b) => {
    if (!a.acknowledged && b.acknowledged) return -1
    if (a.acknowledged && !b.acknowledged) return 1
    if (a.level === 'critical' && b.level !== 'critical') return -1
    if (a.level !== 'critical' && b.level === 'critical') return 1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  // In compact mode, show only unacknowledged
  const displayAlerts = compact ? unacknowledgedAlerts.slice(0, 5) : sortedAlerts

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${criticalCount > 0 ? 'bg-red-500/20' :
              warningCount > 0 ? 'bg-yellow-500/20' :
                'bg-green-500/20'
            }`}>
            {unacknowledgedAlerts.length > 0 ? (
              <Bell className={`w-6 h-6 ${criticalCount > 0 ? 'text-red-400 animate-bounce' :
                  warningCount > 0 ? 'text-yellow-400' :
                    'text-green-400'
                }`} />
            ) : (
              <BellOff className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {compact ? 'Recent Alerts' : 'Alerts'}
            </h2>
            <p className="text-sm text-gray-400">
              {unacknowledgedAlerts.length > 0
                ? `${unacknowledgedAlerts.length} active alerts`
                : 'No active alerts'
              }
            </p>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {warningCount}
            </span>
          )}
          {!compact && acknowledgedAlerts.length > 0 && (
            <button
              onClick={onClearAcknowledged}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 
                         text-gray-400 hover:text-white text-sm transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Alerts list */}
      {displayAlerts.length > 0 ? (
        <div className="space-y-3">
          {displayAlerts.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledge}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
          <p className="text-gray-400">All systems operating normally</p>
          <p className="text-sm text-gray-500 mt-1">No active alerts</p>
        </div>
      )}

      {/* Show more link in compact mode */}
      {compact && unacknowledgedAlerts.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
          <span className="text-sm text-cyan-400">
            + {unacknowledgedAlerts.length - 5} more alerts
          </span>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel
