import React from 'react'
import { AlertTriangle, AlertCircle, CheckCircle, Bell, BellOff, Clock, Trash2 } from 'lucide-react'

// Get alert styling based on level
const getAlertStyles = (level, acknowledged) => {
  if (acknowledged) {
    return {
      bg: 'bg-gray-800/30',
      border: 'border-gray-600/50',
      iconBg: 'bg-gray-500/20',
      icon: 'text-gray-400',
      text: 'text-gray-400',
      badge: 'bg-gray-600/50 text-gray-400'
    }
  }

  switch (level) {
    case 'critical':
      return {
        bg: 'bg-status-critical/5',
        border: 'border-status-critical/50',
        iconBg: 'bg-status-critical/20',
        icon: 'text-status-critical',
        text: 'text-status-critical',
        badge: 'bg-status-critical/20 text-status-critical',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]'
      }
    case 'warning':
      return {
        bg: 'bg-status-warning/5',
        border: 'border-status-warning/50',
        iconBg: 'bg-status-warning/20',
        icon: 'text-status-warning',
        text: 'text-status-warning',
        badge: 'bg-status-warning/20 text-status-warning',
        glow: ''
      }
    default:
      return {
        bg: 'bg-primary/5',
        border: 'border-primary/30',
        iconBg: 'bg-primary/20',
        icon: 'text-primary',
        text: 'text-primary-light',
        badge: 'bg-primary/20 text-primary',
        glow: ''
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
const AlertItem = ({ alert, onAcknowledge }) => {
  const styles = getAlertStyles(alert.level, alert.acknowledged)
  const isCritical = alert.level === 'critical' && !alert.acknowledged
  const Icon = alert.level === 'critical' ? AlertTriangle : AlertCircle

  return (
    <div className={`
      glass-card p-4 border-l-4 ${styles.border} ${styles.bg}
      ${isCritical ? `animate-pulse ${styles.glow}` : ''}
      transition-all duration-300 hover:border-l-primary
    `}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${styles.iconBg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${styles.icon} ${isCritical ? 'animate-bounce' : ''}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-semibold ${styles.text}`}>
              {formatParameter(alert.parameter)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${styles.badge} font-medium`}>
              {alert.level === 'critical' ? 'CRITICAL' : alert.level === 'warning' ? 'WARNING' : 'INFO'}
            </span>
            {alert.acknowledged && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/50 text-gray-400">
                Acknowledged
              </span>
            )}
          </div>

          <p className={`text-sm ${alert.acknowledged ? 'text-gray-500' : 'text-gray-300'}`}>
            {alert.message}
          </p>

          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{new Date(alert.timestamp).toLocaleString()}</span>
          </div>
        </div>

        {/* Acknowledge button */}
        {!alert.acknowledged && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="flex-shrink-0 p-2 rounded-lg bg-white/5 hover:bg-white/10 
                       transition-colors text-gray-400 hover:text-status-nominal"
            title="Acknowledge"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Main Alerts Panel
function AlertsPanel({ alerts = [], onAcknowledge, compact, onClearAcknowledged }) {
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged)
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged)
  const criticalCount = unacknowledgedAlerts.filter(a => a.level === 'critical').length
  const warningCount = unacknowledgedAlerts.filter(a => a.level === 'warning').length

  const sortedAlerts = [...unacknowledgedAlerts, ...acknowledgedAlerts].sort((a, b) => {
    if (!a.acknowledged && b.acknowledged) return -1
    if (a.acknowledged && !b.acknowledged) return 1
    if (a.level === 'critical' && b.level !== 'critical') return -1
    if (a.level !== 'critical' && b.level === 'critical') return 1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  const displayAlerts = compact ? unacknowledgedAlerts.slice(0, 5) : sortedAlerts

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${criticalCount > 0 ? 'bg-status-critical/20' :
              warningCount > 0 ? 'bg-status-warning/20' : 'bg-status-nominal/20'
            }`}>
            {unacknowledgedAlerts.length > 0 ? (
              <Bell className={`w-6 h-6 ${criticalCount > 0 ? 'text-status-critical animate-bounce' :
                  warningCount > 0 ? 'text-status-warning' : 'text-status-nominal'
                }`} />
            ) : (
              <BellOff className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              {compact ? 'Recent Alerts' : 'Alerts'}
            </h2>
            <p className="text-sm text-gray-400">
              {unacknowledgedAlerts.length > 0
                ? `${unacknowledgedAlerts.length} active alerts`
                : 'No active alerts'}
            </p>
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-status-critical/20 text-status-critical text-sm font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {criticalCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-status-warning/20 text-status-warning text-sm">
              <AlertCircle className="w-4 h-4" />
              {warningCount}
            </span>
          )}
          {!compact && acknowledgedAlerts.length > 0 && (
            <button
              onClick={onClearAcknowledged}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 
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
        <div className="space-y-3 stagger-children">
          {displayAlerts.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledge}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-status-nominal/30 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">All systems nominal</p>
          <p className="text-sm text-gray-500 mt-1">No active alerts</p>
        </div>
      )}

      {/* Show more in compact mode */}
      {compact && unacknowledgedAlerts.length > 5 && (
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <span className="text-sm text-primary">
            + {unacknowledgedAlerts.length - 5} more alerts
          </span>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel
