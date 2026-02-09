import React from 'react'
import { Flame, Home, Building2, Cpu, ThermometerSun, Droplets, Wind, AlertTriangle, CheckCircle, Zap, Shirt, AirVent, Lightbulb, Utensils } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const EnergyConsumptionPanel = ({ telemetry, power, config }) => {
    // ============================================
    // DATA CALCULATIONS (Population: 10,000)
    // ============================================

    // Large Apartments: 2,333 units × 3 people = 7,000 people
    // Small Apartments: 3,000 units × 1 person = 3,000 people

    const populationData = {
        largeApartments: {
            units: 2333,
            people: 7000,
            area: 180, // m²
            hourlyPerUnit: 19.464, // kWh
            dailyTotal: 1089828.288 // kW
        },
        smallApartments: {
            units: 3000,
            people: 3000,
            area: 60, // m²
            hourlyPerUnit: 12.823, // kWh
            dailyTotal: 923256.0 // kW
        }
    }

    const grandTotalDaily = populationData.largeApartments.dailyTotal + populationData.smallApartments.dailyTotal
    const supportSystemsOverhead = grandTotalDaily * 0.08 // 8% overhead for support systems
    const totalWithSupport = grandTotalDaily + supportSystemsOverhead

    // System Distribution (aggregated for entire population)
    // Based on typical residential energy breakdown
    const systemDistribution = [
        {
            name: 'Air Conditioning',
            icon: AirVent,
            percentage: 42,
            consumption: grandTotalDaily * 0.42,
            status: 'nominal',
            priority: 'critical'
        },
        {
            name: 'Lighting Systems',
            icon: Lightbulb,
            percentage: 18,
            consumption: grandTotalDaily * 0.18,
            status: 'nominal',
            priority: 'normal'
        },
        {
            name: 'Cooking Equipment',
            icon: Utensils,
            percentage: 22,
            consumption: grandTotalDaily * 0.22,
            status: 'nominal',
            priority: 'normal'
        },
        {
            name: 'Washing Machines',
            icon: Shirt,
            percentage: 12,
            consumption: grandTotalDaily * 0.12,
            status: 'nominal',
            priority: 'low'
        },
        {
            name: 'Other Appliances',
            icon: Cpu,
            percentage: 6,
            consumption: grandTotalDaily * 0.06,
            status: 'nominal',
            priority: 'low'
        }
    ]

    // Power Allocation Chart Data
    const allocationData = [
        {
            name: 'Residential (Large)',
            value: populationData.largeApartments.dailyTotal,
            percentage: ((populationData.largeApartments.dailyTotal / totalWithSupport) * 100).toFixed(1)
        },
        {
            name: 'Residential (Small)',
            value: populationData.smallApartments.dailyTotal,
            percentage: ((populationData.smallApartments.dailyTotal / totalWithSupport) * 100).toFixed(1)
        },
        {
            name: 'Support Systems',
            value: supportSystemsOverhead,
            percentage: ((supportSystemsOverhead / totalWithSupport) * 100).toFixed(1)
        }
    ]

    const CHART_COLORS = ['#f472b6', '#a78bfa', '#38bdf8']

    // Sensor Status (using telemetry if available, otherwise defaults)
    const sensorStatuses = [
        {
            name: 'Temperature',
            icon: ThermometerSun,
            value: telemetry?.temperature?.value ?? 22.4,
            unit: '°C',
            status: telemetry?.statuses?.temperature ?? 'nominal'
        },
        {
            name: 'Humidity',
            icon: Droplets,
            value: telemetry?.humidity?.value ?? 45,
            unit: '%',
            status: telemetry?.statuses?.humidity ?? 'nominal'
        },
        {
            name: 'Gas (MQ-2)',
            icon: Wind,
            value: telemetry?.smoke?.value ?? 120,
            unit: 'ppm',
            status: telemetry?.statuses?.smoke ?? 'nominal'
        },
        {
            name: 'CO (MQ-7)',
            icon: AlertTriangle,
            value: telemetry?.co?.value ?? 8,
            unit: 'ppm',
            status: telemetry?.statuses?.co ?? 'nominal'
        }
    ]

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const formatNumber = (num) => num.toLocaleString('en-US', { maximumFractionDigits: 0 })

    const formatPower = (kw) => {
        if (kw >= 1000000) return `${(kw / 1000000).toFixed(2)} GW`
        if (kw >= 1000) return `${(kw / 1000).toFixed(0)} MW`
        return `${kw.toFixed(0)} kW`
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'nominal': return 'text-status-nominal'
            case 'warning': return 'text-status-warning'
            case 'critical': return 'text-status-critical'
            default: return 'text-gray-400'
        }
    }

    const getStatusBg = (status) => {
        switch (status) {
            case 'nominal': return 'bg-status-nominal/10 border-status-nominal/30'
            case 'warning': return 'bg-status-warning/10 border-status-warning/30'
            case 'critical': return 'bg-status-critical/10 border-status-critical/30 animate-pulse'
            default: return 'bg-gray-500/10 border-gray-500/30'
        }
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'text-primary'
            case 'normal': return 'text-blue-400'
            default: return 'text-gray-400'
        }
    }

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* SECTION 1: Total Consumption Summary */}
            <div className="glass-card p-6 animate-slide-up">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
                            <Flame className="w-6 h-6 text-pink-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-bold text-white">Energy Consumption</h2>
                            <p className="text-sm text-gray-400">Station-wide residential power usage</p>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-status-nominal/15 to-status-nominal/5 border border-status-nominal/30">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-nominal opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-nominal"></span>
                            </span>
                            <span className="font-bold text-status-nominal uppercase tracking-wider text-sm">NOMINAL</span>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card glass-card-hover p-5 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-display font-bold text-pink-400 mb-1">
                            {formatPower(totalWithSupport)}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Daily Consumption</div>
                        <span className="inline-block px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold">
                            {formatNumber(totalWithSupport)} kW/day
                        </span>
                    </div>

                    <div className="glass-card glass-card-hover p-5 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <Home className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-display font-bold text-primary mb-1">
                            {formatNumber(populationData.largeApartments.units + populationData.smallApartments.units)}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Residential Units</div>
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            10,000 Residents
                        </span>
                    </div>

                    <div className="glass-card glass-card-hover p-5 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-3xl font-display font-bold text-status-nominal mb-1">
                            {((grandTotalDaily / totalWithSupport) * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Grid Efficiency</div>
                        <span className="inline-block px-3 py-1 rounded-full bg-status-nominal/10 text-status-nominal text-xs font-bold">
                            Optimal
                        </span>
                    </div>
                </div>
            </div>

            {/* SECTION 2: System Distribution & Power Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Distribution List */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-status-warning/10">
                            <Zap className="w-6 h-6 text-status-warning" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-bold text-white">System Distribution</h2>
                            <p className="text-sm text-gray-400">Major energy consumers breakdown</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {systemDistribution.map((system, index) => {
                            const Icon = system.icon
                            return (
                                <div key={index} className="glass-card glass-card-hover p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-semibold text-white">{system.name}</span>
                                            <span className={`text-xs uppercase ${getPriorityColor(system.priority)}`}>
                                                {system.priority}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-base font-bold text-white tabular-nums">
                                                {formatPower(system.consumption)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="progress-bar h-1.5 rounded-full">
                                        <div
                                            className="progress-fill progress-fill-animated nominal h-full rounded-full"
                                            style={{
                                                width: `${system.percentage}%`,
                                                background: system.percentage > 30
                                                    ? 'linear-gradient(90deg, #f472b6 0%, #a78bfa 100%)'
                                                    : 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)'
                                            }}
                                        />
                                    </div>
                                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                                        <span>{system.percentage}% of total</span>
                                        <span className={getStatusColor(system.status)}>
                                            {system.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Total Usage */}
                        <div className="glass-card p-4 border-primary/30 bg-gradient-to-r from-pink-500/5 to-purple-500/5">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-white">Total Residential:</span>
                                <span className="text-xl font-bold text-pink-400 tabular-nums">
                                    {formatPower(grandTotalDaily)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Power Allocation Chart */}
                <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Building2 className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-bold text-white">Power Allocation</h2>
                            <p className="text-sm text-gray-400">Residential sector breakdown</p>
                        </div>
                    </div>

                    <div className="glass-card p-4">
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={allocationData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                                    outerRadius={90}
                                    innerRadius={50}
                                    fill="#8884d8"
                                    dataKey="value"
                                    strokeWidth={2}
                                    stroke="rgba(15, 23, 42, 0.8)"
                                >
                                    {allocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => formatPower(value)}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(56, 189, 248, 0.2)',
                                        borderRadius: '0.75rem',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#e2e8f0' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 space-y-2">
                        {allocationData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: CHART_COLORS[index] }}
                                    />
                                    <span className="text-gray-300">{item.name}</span>
                                </div>
                                <span className="text-white font-medium tabular-nums">
                                    {formatPower(item.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>




        </div>
    )
}

export default EnergyConsumptionPanel
