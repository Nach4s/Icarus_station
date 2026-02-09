import React, { useState, useEffect, useRef } from 'react'
import { Flame, Droplets, Beef, Activity, Package, Wheat, Leaf, Archive, TrendingUp, ClipboardList, Clock, CheckCircle } from 'lucide-react'

const NutritionPanel = ({ nutrition, config }) => {
  const [displayedNutrition, setDisplayedNutrition] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const lastUpdateTime = useRef(Date.now())



  // Generate stable, slightly varying values for vitals
  const generateStableValues = (baseData) => {
    const gently = (current, min, max) => {
      const variation = current * (Math.random() * 0.06 - 0.03)
      const newValue = current + variation
      return Math.max(min, Math.min(max, newValue))
    }

    return {
      calories: Math.round(gently(2950, 2850, 3150)),
      water: parseFloat(gently(2.2, 2.1, 2.4).toFixed(2)),
      protein: Math.round(gently(54, 50, 60)),

      // Micronutrients with gentle variation
      calcium: Math.round(gently(920, 880, 1050)),
      magnesium: Math.round(gently(380, 360, 420)),
      phosphorus: Math.round(gently(680, 650, 730)),
      potassium: Math.round(gently(4500, 4300, 4900))
    }
  }

  useEffect(() => {
    if (!displayedNutrition) {
      setDisplayedNutrition(generateStableValues())
      lastUpdateTime.current = Date.now()
    }
  }, [displayedNutrition])

  useEffect(() => {
    const updateInterval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastUpdateTime.current

      if (timeSinceLastUpdate >= 60000) {
        setIsUpdating(true)
        const newValues = generateStableValues()

        setTimeout(() => {
          setDisplayedNutrition(newValues)
          setIsUpdating(false)
          lastUpdateTime.current = now
        }, 100)
      }
    }, 1000)

    return () => clearInterval(updateInterval)
  }, [])

  const data = displayedNutrition || {
    calories: 2950,
    water: 2.2,
    protein: 54,
    calcium: 920,
    magnesium: 380,
    phosphorus: 680,
    potassium: 4500
  }

  // Supply inventory data
  const supplyInventory = [
    {
      category: 'Bulk Staples',
      icon: Wheat,
      items: ['Wheat', 'White Rice', 'Beans'],
      status: 'high',
      level: 95
    },
    {
      category: 'Proteins',
      icon: Beef,
      items: ['Canned Meats', 'Powdered Eggs', 'Nut Butter'],
      status: 'medium',
      level: 60
    },
    {
      category: 'Fresh/Hydroponics',
      icon: Leaf,
      items: ['Kale', 'Spinach', 'Basil'],
      status: 'critical',
      level: 15
    },
    {
      category: 'Preserved',
      icon: Archive,
      items: ['Freeze-dried Fruits', 'Dehydrated Veggies'],
      status: 'high',
      level: 88
    }
  ]

  // Daily Ration Schedule Data
  const rationSchedule = [
    {
      time: '07:30',
      code: 'RTN-01',
      meal: 'Breakfast',
      description: 'Scrambled Powdered Eggs with rehydrated spinach & wheat toast'
    },
    {
      time: '11:00',
      code: 'RTN-02',
      meal: 'Snack',
      description: 'Nut butter ration & dried fruit'
    },
    {
      time: '13:00',
      code: 'RTN-03',
      meal: 'Lunch',
      description: 'Canned Beef with white rice & dehydrated veggie mix'
    },
    {
      time: '19:00',
      code: 'RTN-04',
      meal: 'Dinner',
      description: 'Potato & Carrot Stew with jerky bits and fresh basil'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return 'text-status-nominal'
      case 'medium': return 'text-status-warning'
      case 'critical': return 'text-status-critical'
      default: return 'text-gray-400'
    }
  }

  const getStatusBg = (status) => {
    switch (status) {
      case 'high': return 'bg-status-nominal'
      case 'medium': return 'bg-status-warning'
      case 'critical': return 'bg-status-critical'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'high': return 'High'
      case 'medium': return 'Medium'
      case 'critical': return 'Low'
      default: return 'Unknown'
    }
  }

  // Highlight hydroponic ingredients
  const renderMenuText = (text) => {
    const keywords = ['spinach', 'basil', 'kale', 'bok choy']
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'))

    return parts.map((part, index) => {
      const lowerPart = part.toLowerCase()
      if (keywords.includes(lowerPart)) {
        return <span key={index} className="text-status-nominal font-bold">{part}</span>
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1: Vital Daily Targets */}
      <div className="glass-card p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-status-nominal/10">
            <TrendingUp className="w-6 h-6 text-status-nominal" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Vital Daily Targets</h2>
            <p className="text-sm text-gray-400">Active Crew Requirements (Adult Male 19-30)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Calories */}
          <div className={`glass-card glass-card-hover p-5 text-center transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-display font-bold text-status-nominal mb-1">
              {data.calories}
            </div>
            <div className="text-xs text-gray-500 mb-3">/ 3000 kcal</div>
            <div className="progress-bar mb-3">
              <div
                className="progress-fill nominal"
                style={{ width: `${Math.min(100, (data.calories / 3000) * 100)}%` }}
              />
            </div>
            <div className="text-xs font-medium text-gray-400 mb-2">Calories</div>
            <span className="inline-block px-3 py-1 rounded-full bg-status-nominal/10 text-status-nominal text-xs font-bold">
              Optimal
            </span>
          </div>

          {/* Water */}
          <div className={`glass-card glass-card-hover p-5 text-center transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-display font-bold text-status-nominal mb-1">
              {data.water}
            </div>
            <div className="text-xs text-gray-500 mb-3">/ 2.3 L</div>
            <div className="progress-bar mb-3">
              <div
                className="progress-fill nominal"
                style={{ width: `${Math.min(100, (data.water / 2.3) * 100)}%` }}
              />
            </div>
            <div className="text-xs font-medium text-gray-400 mb-2">Water</div>
            <span className="inline-block px-3 py-1 rounded-full bg-status-nominal/10 text-status-nominal text-xs font-bold">
              Optimal
            </span>
          </div>

          {/* Protein */}
          <div className={`glass-card glass-card-hover p-5 text-center transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Beef className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-display font-bold text-status-nominal mb-1">
              {data.protein}
            </div>
            <div className="text-xs text-gray-500 mb-3">/ 56 g</div>
            <div className="progress-bar mb-3">
              <div
                className="progress-fill nominal"
                style={{ width: `${Math.min(100, (data.protein / 56) * 100)}%` }}
              />
            </div>
            <div className="text-xs font-medium text-gray-400 mb-2">Protein</div>
            <span className="inline-block px-3 py-1 rounded-full bg-status-nominal/10 text-status-nominal text-xs font-bold">
              Optimal
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Micronutrient Monitor */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Micronutrient Monitor</h2>
            <p className="text-sm text-gray-400">Essential mineral levels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calcium */}
          <div className={`glass-card p-4 transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Calcium</span>
              <span className="text-sm text-gray-400">{data.calcium} / 1000 mg</span>
            </div>
            <div className="progress-bar segmented">
              <div
                className={`progress-fill ${data.calcium >= 950 ? 'nominal' : data.calcium >= 800 ? 'warning' : 'critical'}`}
                style={{ width: `${Math.min(100, (data.calcium / 1000) * 100)}%` }}
              />
            </div>
          </div>

          {/* Magnesium */}
          <div className={`glass-card p-4 transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Magnesium</span>
              <span className="text-sm text-gray-400">{data.magnesium} / 400 mg</span>
            </div>
            <div className="progress-bar segmented">
              <div
                className={`progress-fill ${data.magnesium >= 380 ? 'nominal' : data.magnesium >= 320 ? 'warning' : 'critical'}`}
                style={{ width: `${Math.min(100, (data.magnesium / 400) * 100)}%` }}
              />
            </div>
          </div>

          {/* Phosphorus */}
          <div className={`glass-card p-4 transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Phosphorus</span>
              <span className="text-sm text-gray-400">{data.phosphorus} / 700 mg</span>
            </div>
            <div className="progress-bar segmented">
              <div
                className={`progress-fill ${data.phosphorus >= 665 ? 'nominal' : data.phosphorus >= 560 ? 'warning' : 'critical'}`}
                style={{ width: `${Math.min(100, (data.phosphorus / 700) * 100)}%` }}
              />
            </div>
          </div>

          {/* Potassium */}
          <div className={`glass-card p-4 transition-all duration-300 ${isUpdating ? 'opacity-70' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Potassium</span>
              <span className="text-sm text-gray-400">{data.potassium} / 4700 mg</span>
            </div>
            <div className="progress-bar segmented">
              <div
                className={`progress-fill ${data.potassium >= 4465 ? 'nominal' : data.potassium >= 3760 ? 'warning' : 'critical'}`}
                style={{ width: `${Math.min(100, (data.potassium / 4700) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Supply Inventory */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Package className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Supply Inventory</h2>
            <p className="text-sm text-gray-400">Available rations & stock levels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplyInventory.map((supply, index) => {
            const Icon = supply.icon
            return (
              <div
                key={index}
                className="glass-card glass-card-hover p-5 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getStatusBg(supply.status)}/10 flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${getStatusColor(supply.status)}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold">{supply.category}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBg(supply.status)}/20 ${getStatusColor(supply.status)}`}>
                        {getStatusLabel(supply.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      {supply.items.join(', ')}
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${supply.status === 'high' ? 'nominal' : supply.status === 'medium' ? 'warning' : 'critical'}`}
                        style={{ width: `${supply.level}%` }}
                      />
                    </div>
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-500">{supply.level}% Stock</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 4: Daily Ration Schedule (New Manifest) */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <ClipboardList className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Daily Ration Schedule</h2>
            <p className="text-sm text-gray-400">Distribution Manifest • Cycle Day 148</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <div className="hidden md:grid grid-cols-12 gap-4 p-3 border-b border-white/10 bg-white/5 text-xs font-mono text-gray-400 uppercase tracking-wider">
            <div className="col-span-2">Time</div>
            <div className="col-span-2">Code</div>
            <div className="col-span-2">Meal</div>
            <div className="col-span-5">Description</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          <div className="divide-y divide-white/5">
            {rationSchedule.map((ration, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                {/* Mobile: Time & Meal Header */}
                <div className="md:col-span-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary md:hidden" />
                  <span className="font-mono font-bold text-primary">{ration.time}</span>
                </div>

                <div className="md:col-span-2 hidden md:block">
                  <span className="font-mono text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">{ration.code}</span>
                </div>

                <div className="md:col-span-2 flex items-center justify-between md:justify-start">
                  <span className="text-white font-medium">{ration.meal}</span>
                  {/* Mobile Code */}
                  <span className="font-mono text-xs text-gray-500 bg-white/5 px-2 py-1 rounded md:hidden">{ration.code}</span>
                </div>

                <div className="col-span-full md:col-span-5 text-sm text-gray-300 pl-6 md:pl-0 border-l-2 border-white/10 md:border-l-0">
                  {renderMenuText(ration.description)}
                </div>

                <div className="md:col-span-1 flex items-center justify-end">
                  <div className="flex items-center gap-1.5 text-status-nominal">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-widest hidden md:inline">Issued</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Last Update Timestamp */}
      {nutrition?.last_check && (
        <div className="text-center">
          <span className="text-xs text-gray-500">Last check: {nutrition.last_check}</span>
        </div>
      )}
    </div>
  )
}

export default NutritionPanel
