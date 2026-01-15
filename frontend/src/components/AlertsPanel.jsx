import React from 'react'
import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react'

const AlertsPanel = ({ alerts, onAcknowledge, compact = false }) => {
  const getAlertIcon = (level) => {
    switch (level) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
      case 'nominal':
        return <CheckCircle className="w-5 h-5 text-green-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getAlertColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-900/30 border-red-500'
      case 'warning':
        return 'bg-yellow-900/30 border-yellow-500'
      case 'info':
      case 'nominal':
        return 'bg-green-900/30 border-green-500'
      default:
        return 'bg-blue-900/30 border-blue-500'
    }
  }

  const getAlertEmoji = (level) => {
    switch (level) {
      case 'critical':
        return '🔴'
      case 'warning':
        return '🟡'
      case 'info':
      case 'nominal':
        return '🟢'
      default:
        return '🔵'
    }
  }

  const displayAlerts = compact ? alerts.slice(-5) : alerts
  const sortedAlerts = [...displayAlerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          System Alerts
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {alerts.filter(a => !a.acknowledged).length}
            </span>
          )}
        </h2>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-400">No active alerts. All systems nominal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 transition-all ${
                alert.acknowledged 
                  ? 'bg-gray-800/30 border-gray-600 opacity-60' 
                  : getAlertColor(alert.level)
              } ${!alert.acknowledged && alert.level === 'critical' ? 'animate-pulse-glow' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getAlertIcon(alert.level)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getAlertEmoji(alert.level)}</span>
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        alert.level === 'critical' ? 'text-red-400' :
                        alert.level === 'warning' ? 'text-yellow-400' :
                        alert.level === 'nominal' || alert.level === 'info' ? 'text-green-400' :
                        'text-blue-400'
                      }`}>
                        {alert.level}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-400">{alert.system}</span>
                      {alert.acknowledged && (
                        <>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-green-400">ACKNOWLEDGED</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-white mb-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 font-mono">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {compact && alerts.length > 5 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Showing latest 5 alerts. View Alerts tab for complete history.
          </p>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel
