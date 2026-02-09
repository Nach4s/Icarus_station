import React from 'react'
import { Zap, TrendingUp, Battery, Sun, Activity, Radio, CheckCircle, Cpu } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const PowerPanel = ({ power, config, detailed = false, showDistribution = true }) => {
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
  const formatPower = (watts) => {
    if (watts >= 1000000) {
      return { value: (watts / 1000000).toFixed(2), unit: 'MW' }
    }
    if (watts >= 1000) {
      return { value: (watts / 1000).toFixed(0), unit: 'kW' }
    }
    return { value: watts, unit: 'W' }
  }

  const totalOutputW = Math.round(satellites.total_output * 1000000)
  const maxCapacityW = Math.round(satellites.max_capacity * 1000000)
  const avgOutputW = Math.round(satellites.average_output * 1000000)

  const systemsData = power.systems.map(system => ({
    name: system.name,
    value: system.current
  }))

  const COLORS = ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#34d399']

  // Power Sources data (Generators with output values)
  const powerSources = [
    { name: 'Jupiter Generator', output: 1700000, maxOutput: 2500000 },
    { name: 'Europa Generator', output: 2350000, maxOutput: 3000000 }
  ]

  // System Status data (Status only, no output figures)
  const systemStatus = [
    { name: 'Jupiter Sensor Network', status: 'WORKING' },
    { name: 'Io Generator', status: 'WORKING' }
  ]

  // Calculate total generator output
  const totalGeneratorOutput = powerSources.reduce((sum, s) => sum + s.output, 0)
  const totalMaxOutput = powerSources.reduce((sum, s) => sum + s.maxOutput, 0)

  // Power Source Card - for generators with output values
  const PowerSourceCard = ({ name, output, maxOutput, index }) => {
    const percentage = (output / maxOutput) * 100
    const formatted = formatPower(output)

    return (
      <div
        className="glass-card glass-card-hover generator-card p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
            <p className="text-xs text-gray-500">Power Generator</p>
          </div>
        </div>

        {/* Power Value */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-bold text-primary tabular-nums">
              {formatNumber(output)}
            </span>
            <span className="text-sm text-gray-400 font-medium">W</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            {formatted.value} {formatted.unit}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="progress-bar h-2 rounded-full overflow-hidden bg-slate-800/80">
            <div
              className="progress-fill progress-fill-animated nominal h-full rounded-full"
              style={{
                width: `${percentage}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'
              }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{percentage.toFixed(0)}% capacity</span>
            <span className="text-gray-600">{formatNumber(maxOutput)} W max</span>
          </div>
        </div>
      </div>
    )
  }

  // Status Card - for systems with nominal status only
  const StatusCard = ({ name, status, index }) => (
    <div
      className="glass-card glass-card-hover status-card p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-status-nominal/20 to-status-nominal/5 border border-status-nominal/30">
          {name.includes('Sensor') ? (
            <Radio className="w-5 h-5 text-status-nominal" />
          ) : (
            <Cpu className="w-5 h-5 text-status-nominal" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
          <p className="text-xs text-gray-500">System Status</p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-status-nominal"></div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-status-nominal" />
          <span className="text-lg font-bold text-status-nominal uppercase tracking-wider">
            {status}
          </span>
        </div>
      </div>

      {/* Uptime indicator */}
      <div className="mt-4 pt-3 border-t border-gray-800/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Uptime</span>
          <span className="text-status-nominal font-medium">99.97%</span>
        </div>
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
    const efficiencyPercent = ((totalGeneratorOutput / totalMaxOutput) * 100).toFixed(0)

    return (
      <div className="glass-card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-status-nominal/10">
            <Zap className="w-6 h-6 text-status-nominal" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Power Network</h2>
            <p className="text-sm text-gray-400">Energy grid status</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <PowerStat
            icon={Zap}
            label="Generators"
            value={powerSources.length}
          />
          <PowerStat
            icon={Radio}
            label="Systems Online"
            value={systemStatus.length}
            color="text-status-nominal"
          />
          <PowerStat
            icon={Zap}
            label="Total Output"
            value={`${formatNumber(totalGeneratorOutput)} W`}
            subValue={`≈${(totalGeneratorOutput / 1000000).toFixed(2)} MW`}
            color="text-primary"
          />
          <PowerStat
            icon={TrendingUp}
            label="Max Capacity"
            value={`${formatNumber(totalMaxOutput)} W`}
            subValue={`≈${(totalMaxOutput / 1000000).toFixed(1)} MW`}
            color="text-blue-400"
          />
          <PowerStat
            icon={Activity}
            label="Efficiency"
            value={`${efficiencyPercent}%`}
            color="text-status-nominal"
          />
          <PowerStat
            icon={CheckCircle}
            label="All Systems"
            value="WORKING"
            color="text-status-nominal"
          />
        </div>
      </div>
    )
  }

  // Detailed mode
  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Power Sources & Status Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-primary/20">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Power Sources & Status</h2>
            <p className="text-sm text-gray-400">Energy grid architecture overview</p>
          </div>
        </div>

        {/* Overall Status badge */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-status-nominal/15 to-status-nominal/5 border border-status-nominal/30">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-nominal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-nominal"></span>
              </span>
              <span className="font-bold text-status-nominal uppercase tracking-wider text-sm">All Systems Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Output Summary */}
      <div className="glass-card p-4 mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="text-sm text-gray-400">Combined Generator Output</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-primary tabular-nums">
              {formatNumber(totalGeneratorOutput)}
            </span>
            <span className="text-gray-400 font-medium">W</span>
            <span className="text-sm text-gray-500">
              ({((totalGeneratorOutput / totalMaxOutput) * 100).toFixed(0)}% capacity)
            </span>
          </div>
        </div>
      </div>

      {/* Power Sources & Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {powerSources.map((source, index) => (
          <PowerSourceCard key={index} {...source} index={index} />
        ))}
        {systemStatus.map((system, index) => (
          <StatusCard key={index} {...system} index={index} />
        ))}
      </div>

      {/* System Distribution and Chart */}
      {showDistribution && (
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
                  <div key={index} className="glass-card glass-card-hover p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{system.name}</span>
                        <span className={`text-xs uppercase ${priorityColor}`}>{system.priority}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-bold text-white tabular-nums">{formatNumber(systemOutputW)} W</span>
                      </div>
                    </div>
                    <div className="progress-bar h-1.5 rounded-full">
                      <div
                        className="progress-fill progress-fill-animated nominal h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 text-right">{percentage.toFixed(1)}% of total</div>
                  </div>
                )
              })}

              {/* Total Usage */}
              <div className="glass-card p-4 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Total Usage:</span>
                  <span className="text-xl font-bold text-primary tabular-nums">
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
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '0.75rem',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PowerPanel
