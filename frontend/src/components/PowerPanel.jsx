import React from 'react'
import { Zap, TrendingUp, Battery, Sun, Activity, Radio, CheckCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PowerPanel = ({ power, config, detailed = false }) => {
  if (!power || !config) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <Activity className="w-8 h-8 text-primary animate-pulse mr-3" />
          <p className="text-gray-400">Loading power data...</p>
        </div>
      </div>
    )
  }

  const powerConfig = config.power
  const satellites = power.satellites

  const formatNumber = (num) => num.toLocaleString('en-US')

  const totalOutputW = Math.round(satellites.total_output * 1000000)
  const maxCapacityW = Math.round(satellites.max_capacity * 1000000)
  const avgOutputW = Math.round(satellites.average_output * 1000000)

  const systemsData = power.systems.map(system => ({
    name: system.name,
    value: system.current
  }))

  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#34d399']

  // Power Sources data
  const powerSources = [
    { name: 'Jupiter Generator', output: 1700000, maxOutput: 2500000 },
    { name: 'Europa Generator', output: 2350000, maxOutput: 3000000 }
  ]

  // System Status data
  const systemStatus = [
    { name: 'Jupiter Sensor Network', status: 'NOMINAL' },
    { name: 'Io Generator', status: 'NOMINAL' }
  ]

  // Power Source Card - for generators with output values
  const PowerSourceCard = ({ name, output, maxOutput }) => {
    const percentage = (output / maxOutput) * 100
    return (
      <div className="glass-card glass-card-hover p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{name}</h3>
            <p className="text-xs text-gray-500">Power Source</p>
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold text-primary">{formatNumber(output)}</span>
            <span className="text-sm text-gray-400">W</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">≈ {(output / 1000000).toFixed(2)} MW</p>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill nominal"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 text-right">{percentage.toFixed(0)}% capacity</div>
      </div>
    )
  }

  // Status Card - for systems with nominal status only
  const StatusCard = ({ name, status }) => (
    <div className="glass-card glass-card-hover p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-status-nominal/10 border border-status-nominal/20">
          <Radio className="w-5 h-5 text-status-nominal" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{name}</h3>
          <p className="text-xs text-gray-500">System Status</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-status-nominal" />
        <span className="text-lg font-bold text-status-nominal uppercase tracking-wider">{status}</span>
      </div>
    </div>
  )

  // Stat card component (kept for overview mode)
  const PowerStat = ({ icon: Icon, label, value, subValue, color = 'text-white' }) => (
    <div className="glass-card glass-card-hover p-4 text-center">
      <div className="stat-icon mx-auto mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className={`text-2xl font-display font-bold ${color}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-1">{subValue}</div>}
      <div className="stat-label mt-2">{label}</div>
    </div>
  )

  // Overview mode
  if (!detailed) {
    return (
      <div className="glass-card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-status-nominal/10">
            <Zap className="w-6 h-6 text-status-nominal" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Power Network</h2>
            <p className="text-sm text-gray-400">Satellite solar array status</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 stagger-children">
          <PowerStat
            icon={Sun}
            label="Total Satellites"
            value={formatNumber(satellites.total_count)}
          />
          <PowerStat
            icon={Battery}
            label="Active"
            value={formatNumber(satellites.online_count)}
            color="text-status-nominal"
          />
          <PowerStat
            icon={Zap}
            label="Total Output"
            value={`${formatNumber(totalOutputW)} W`}
            subValue={`≈${satellites.total_output.toFixed(1)} MW`}
            color="text-primary"
          />
          <PowerStat
            icon={TrendingUp}
            label="Max Capacity"
            value={`${formatNumber(maxCapacityW)} W`}
            subValue={`≈${satellites.max_capacity.toFixed(1)} MW`}
            color="text-blue-400"
          />
          <PowerStat
            icon={Activity}
            label="Efficiency"
            value={`${satellites.efficiency}%`}
            color="text-status-nominal"
          />
          <PowerStat
            icon={Sun}
            label="Avg per Satellite"
            value={`${avgOutputW} W`}
            color="text-status-warning"
          />
        </div>
      </div>
    )
  }

  // Detailed mode
  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Power Sources & Status Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Power Sources & Status</h2>
            <p className="text-sm text-gray-400">Energy grid architecture overview</p>
          </div>
        </div>

        {/* Overall Status badge */}
        <div className="px-4 py-2 rounded-lg bg-status-nominal/10 border border-status-nominal/30">
          <span className="font-bold text-status-nominal uppercase tracking-wider">ONLINE</span>
        </div>
      </div>

      {/* Power Sources & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stagger-children">
        {powerSources.map((source, index) => (
          <PowerSourceCard key={index} {...source} />
        ))}
        {systemStatus.map((system, index) => (
          <StatusCard key={index} {...system} />
        ))}
      </div>

      {/* System Distribution and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-status-warning" />
            System Distribution
          </h3>
          <div className="space-y-3">
            {power.systems.map((system, index) => {
              const percentage = (system.current / power.generation) * 100
              const systemOutputW = Math.round(system.current * 1000000)
              const priorityColor =
                system.priority === 'critical' ? 'text-primary' :
                  system.priority === 'normal' ? 'text-blue-400' : 'text-gray-400'

              return (
                <div key={index} className="glass-card p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{system.name}</span>
                      <span className={`text-xs uppercase ${priorityColor}`}>{system.priority}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-white">{formatNumber(systemOutputW)} W</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill nominal"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500 text-right">{percentage.toFixed(1)}% of total</div>
                </div>
              )
            })}

            {/* Total Usage */}
            <div className="glass-card p-4 border-primary/30">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white">Total Usage:</span>
                <span className="text-xl font-bold text-primary">
                  {formatNumber(Math.round(power.consumption * 1000000))} W
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Power Allocation
          </h3>
          <div className="glass-card p-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={systemsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
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
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '0.5rem',
                    backdropFilter: 'blur(10px)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PowerPanel
