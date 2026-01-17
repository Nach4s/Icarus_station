import React from 'react'
import { Activity, Users, AlertTriangle, CheckCircle, Zap, Radio, Wifi, WifiOff, Orbit } from 'lucide-react'

const StationStatus = ({ status }) => {
  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'nominal':
        return 'text-status-nominal'
      case 'warning':
      case 'attention':
        return 'text-status-warning'
      case 'critical':
        return 'text-status-critical'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBg = (statusType) => {
    switch (statusType) {
      case 'nominal':
        return 'bg-status-nominal/10 border-status-nominal/30'
      case 'warning':
      case 'attention':
        return 'bg-status-warning/10 border-status-warning/30'
      case 'critical':
        return 'bg-status-critical/10 border-status-critical/30 animate-pulse'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  const getStatusText = (statusType) => {
    switch (statusType) {
      case 'nominal':
        return 'NOMINAL'
      case 'warning':
        return 'WARNING'
      case 'critical':
        return 'CRITICAL'
      default:
        return statusType?.toUpperCase() || 'N/A'
    }
  }

  const StatCard = ({ icon: Icon, label, value, unit, status: cardStatus }) => (
    <div className="stat-card glass-card-hover group">
      <div className="stat-icon group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="stat-value">{value}{unit}</div>
      <div className="stat-label">{label}</div>
      {cardStatus && (
        <div className={`mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusBg(cardStatus)}`}>
          <span className={`status-dot ${cardStatus}`}></span>
          <span className={getStatusColor(cardStatus)}>{getStatusText(cardStatus)}</span>
        </div>
      )}
    </div>
  )

  return (
    <div className="mb-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-8 mb-6">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          {/* Title and status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Orbit className="w-8 h-8 text-primary animate-float" />
                <h2 className="heading-display heading-lg text-white">
                  Station Overview
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                Real-time monitoring and system status
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Arduino connection */}
              <div className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                ${status.arduino_connected
                  ? 'bg-status-nominal/10 border border-status-nominal/30'
                  : 'bg-status-critical/10 border border-status-critical/30'}
              `}>
                {status.arduino_connected ? (
                  <>
                    <Wifi className="w-4 h-4 text-status-nominal" />
                    <span className="text-sm text-status-nominal font-medium">Arduino</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-status-critical" />
                    <span className="text-sm text-status-critical font-medium">No Link</span>
                  </>
                )}
              </div>

              {/* Overall status badge */}
              <div className={`px-4 py-2 rounded-lg border ${getStatusBg(status.status)}`}>
                <span className={`font-bold uppercase tracking-wider ${getStatusColor(status.status)}`}>
                  {getStatusText(status.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 stagger-children">
            <StatCard
              icon={Users}
              label="Population"
              value={status.crew_size?.toLocaleString() || '0'}
              unit=""
            />
            <StatCard
              icon={Zap}
              label="Power Level"
              value={status.power_status?.toFixed(0) || '0'}
              unit="%"
            />
            <StatCard
              icon={Radio}
              label="Sensors"
              value=""
              status={status.environment_status}
            />
            <StatCard
              icon={CheckCircle}
              label="Pending Tasks"
              value={status.pending_tasks || '0'}
              unit=""
            />
            <StatCard
              icon={AlertTriangle}
              label="Active Alerts"
              value={status.active_alerts || '0'}
              unit=""
              status={status.critical_alerts > 0 ? 'critical' : status.active_alerts > 0 ? 'warning' : 'nominal'}
            />
          </div>

          {/* Info footer */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Location:</span>
                <span className="text-white font-medium">{status.station?.location || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Mission:</span>
                <span className="text-white font-medium">{status.station?.mission_duration || '80 Earth Years'}</span>
              </div>
              {status.last_update && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Last Update:</span>
                  <span className="text-white font-medium font-mono">
                    {new Date(status.last_update).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StationStatus
