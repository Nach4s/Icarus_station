import React from 'react'
import { Zap, TrendingUp } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PowerPanel = ({ power, config, detailed = false }) => {
  if (!power || !config) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
        <p className="text-gray-400">Loading power data...</p>
      </div>
    )
  }

  const powerConfig = config.power
  const satellites = power.satellites

  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toLocaleString('en-US')
  }

  // Convert MW to W for display
  const totalOutputW = Math.round(satellites.total_output * 1000000)
  const maxCapacityW = Math.round(satellites.max_capacity * 1000000)
  const avgOutputW = Math.round(satellites.average_output * 1000000)

  const systemsData = power.systems.map(system => ({
    name: system.name,
    value: system.current
  }))

  const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981']

  // Overview mode: Clean, minimal display
  if (!detailed) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-8 text-center border-b border-gray-600 pb-4">
          Satellite Power Network
        </h2>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-lg text-gray-300 font-medium">Total Satellites:</span>
            <span className="text-3xl font-bold text-white">{formatNumber(satellites.total_count)}</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-lg text-gray-300 font-medium">Active Satellites:</span>
            <span className="text-3xl font-bold text-green-400">{formatNumber(satellites.online_count)}</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-lg text-gray-300 font-medium">Total Output:</span>
            <div className="text-right">
              <div className="text-3xl font-bold text-cyan-400">{formatNumber(totalOutputW)} W</div>
              <div className="text-sm text-gray-400 mt-1">≈{satellites.total_output.toFixed(1)} MW</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-lg text-gray-300 font-medium">Max Capacity:</span>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">{formatNumber(maxCapacityW)} W</div>
              <div className="text-sm text-gray-400 mt-1">≈{satellites.max_capacity.toFixed(1)} MW</div>
            </div>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span className="text-lg text-gray-300 font-medium">Efficiency:</span>
            <span className="text-3xl font-bold text-green-400">{satellites.efficiency}%</span>
          </div>
          
          <div className="flex justify-between items-center py-3">
            <span className="text-lg text-gray-300 font-medium">Avg Output per Satellite:</span>
            <span className="text-3xl font-bold text-yellow-400">≈{avgOutputW} W</span>
          </div>
        </div>
      </div>
    )
  }

  // Detailed mode: Full dashboard with charts
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-gray-700 p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-2">
        Satellite Power Network
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        Solar array network operating at full capacity in Kuiper Belt orbit.
      </p>

      {/* Power System Status Banner */}
      <div className="mb-6 p-4 rounded-lg border-2 bg-green-900/50 border-green-500">
        <div className="text-center">
          <p className="text-sm uppercase tracking-wider mb-1 text-green-400">Power System</p>
          <p className="text-3xl font-bold text-green-400">NOMINAL</p>
        </div>
      </div>

      {/* Main Satellite Network Statistics */}
      <div className="mb-6 bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Total Satellites</p>
            <p className="text-4xl font-bold text-white">{formatNumber(satellites.total_count)}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Active Satellites</p>
            <p className="text-4xl font-bold text-green-400">{formatNumber(satellites.online_count)}</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Total Output</p>
            <p className="text-4xl font-bold text-cyan-400">{formatNumber(totalOutputW)} W</p>
            <p className="text-xs text-gray-500 mt-1">{satellites.total_output.toFixed(1)} MW</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Max Capacity</p>
            <p className="text-4xl font-bold text-blue-400">{formatNumber(maxCapacityW)} W</p>
            <p className="text-xs text-gray-500 mt-1">{satellites.max_capacity.toFixed(1)} MW</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Efficiency</p>
            <p className="text-4xl font-bold text-green-400">{satellites.efficiency}%</p>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">Avg Output per Satellite</p>
            <p className="text-4xl font-bold text-yellow-400">≈{avgOutputW} W</p>
          </div>
        </div>
      </div>

      {/* System Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            System Distribution
          </h3>
          <div className="space-y-3">
            {power.systems.map((system, index) => {
              const percentage = (system.current / power.generation) * 100
              const systemOutputW = Math.round(system.current * 1000000)
              const priorityColor = 
                system.priority === 'critical' ? 'text-cyan-400' :
                system.priority === 'normal' ? 'text-blue-400' :
                'text-gray-400'
              
              return (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">{system.name}</span>
                      <span className={`text-xs uppercase ${priorityColor}`}>
                        {system.priority}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white block">
                        {formatNumber(systemOutputW)} W
                      </span>
                      <span className="text-xs text-gray-400">
                        {system.current.toFixed(2)} MW
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-400 text-right">
                    {percentage.toFixed(1)}% of total
                  </div>
                </div>
              )
            })}
            
            {/* Total Power Usage Summary */}
            <div className="mt-4 pt-4 border-t-2 border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-white">Total Power Usage:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-cyan-400">
                    {formatNumber(Math.round(power.consumption * 1000000))} W
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {power.consumption.toFixed(3)} MW
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Power Allocation Chart
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={systemsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {systemsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value.toFixed(2)} MW`}
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '0.5rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default PowerPanel
