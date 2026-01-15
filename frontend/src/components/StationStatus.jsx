import React from 'react'
import { Activity, Users, AlertTriangle, CheckCircle, Zap, Radio } from 'lucide-react'

const StationStatus = ({ status }) => {
  const getStatusColor = (statusType) => {
    switch (statusType) {
      case 'nominal':
        return 'text-green-400 bg-green-900/30 border-green-500'
      case 'warning':
      case 'attention':
        return 'text-yellow-400 bg-yellow-900/30 border-yellow-500'
      case 'critical':
        return 'text-red-400 bg-red-900/30 border-red-500'
      default:
        return 'text-gray-400 bg-gray-900/30 border-gray-500'
    }
  }

  const formatPopulation = (num) => {
    return num.toLocaleString()
  }

  return (
    <div className="mb-6 animate-slide-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-space-cyan" />
            Station Overview
          </h2>
          <div className={`px-4 py-2 rounded-lg border ${getStatusColor(status.status)}`}>
            <span className="font-bold uppercase tracking-wider">
              {status.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Population</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatPopulation(status.crew_size)}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Power Level</span>
            </div>
            <p className="text-2xl font-bold text-white">{status.power_status.toFixed(1)}%</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-gray-400">Comm Link</span>
            </div>
            <p className={`text-lg font-bold ${
              status.comm_status === 'nominal' ? 'text-green-400' : 'text-red-400'
            }`}>
              {status.comm_status ? status.comm_status.toUpperCase() : 'NOMINAL'}
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Active Tasks</span>
            </div>
            <p className="text-2xl font-bold text-white">{status.pending_tasks}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Alerts</span>
            </div>
            <p className="text-2xl font-bold text-white">{status.active_alerts}</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Location:</span>
              <span className="text-white font-medium">{status.station.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Mission Duration:</span>
              <span className="text-white font-medium">{status.station.mission_duration || '80 Earth Years'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StationStatus
