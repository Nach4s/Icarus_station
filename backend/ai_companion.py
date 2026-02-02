"""
AI Companion Module for Baiterek Station
Provides intelligent analysis of station data using OpenAI API.
"""

import os
import json
from datetime import datetime

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("[AI] Warning: openai library not installed. AI features disabled.")

# System prompt for AI personality (English)
SYSTEM_PROMPT = """You are the AI Companion of "Baiterek Station", a space station orbiting Jupiter with {crew_size} crew members.

ROLE:
- Station engineer, medical analyst, and knowledgeable assistant
- Analyze station data when relevant to the question
- Help crew with ANY questions — scientific, educational, practical, or conversational
- Be a helpful companion during long space missions

RULES:
1. For station-related questions: use ONLY data from the STATION CONTEXT below — never fabricate station data
2. For general questions: provide accurate, helpful information based on your knowledge
3. If station data is insufficient — state this clearly
4. Never hide dangerous readings or critical alerts
5. Respond calmly, professionally, but also friendly and supportive
6. Use markdown formatting for clarity (headers, bullets, bold for emphasis)
7. Respond in the same language as the crew's question

CAPABILITIES:
- Station monitoring and analysis (sensors, alerts, power, nutrition)
- Medical and health advice for crew
- Scientific explanations and education
- General knowledge and trivia
- Practical advice and problem-solving
- Friendly conversation to support crew morale

DATA INTERPRETATION (for station queries):
- Temperature: normal 15-35°C, optimal 22°C
- Humidity: normal 30-70%, optimal 50%
- Pressure: normal 950-1050 hPa, optimal 1013 hPa
- Smoke/Gas (MQ-2): normal 0-30%, dangerous >50%
- CO (MQ-7): normal 0-30%, dangerous >50%

NUTRITION GUIDELINES:
- Calories: optimal 2500 kcal/day, warning if deficit >200
- Protein: optimal 100g/day, warning if deficit >15
- Water: optimal 2.0L/day, warning if deficit >0.3
- Vitamins: optimal 100%, warning if below 90%

RISK REPORTING FORMAT (when danger detected):
⚠️ **RISK DETECTED**
- **Source:** [sensor/system name]
- **Level:** [LOW / MEDIUM / CRITICAL]
- **Current Value:** [reading with units]
- **Safe Range:** [min - max]
- **Recommended Action:** [specific steps to take]

STATION CONTEXT (JSON):
{context}

Remember: 
- For station questions — use the context data above
- For general questions — use your knowledge to help the crew
- Always be supportive — you are their companion in space!"""


class AICompanion:
    """AI Companion for station analysis and chat using OpenAI API"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.client = None
        self.model = "gpt-4o-mini"  # Cost-effective model with good performance
        
        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                print("[AI] OpenAI API initialized successfully")
            except Exception as e:
                print(f"[AI] Failed to initialize OpenAI: {e}")
                self.client = None
        else:
            if not OPENAI_AVAILABLE:
                print("[AI] Running in demo mode (openai library not installed)")
            else:
                print("[AI] Running in demo mode (no API key)")
    
    def build_context(self, telemetry, alerts, nutrition, power, tasks, station_status):
        """Build comprehensive station context for AI"""
        
        context = {
            "timestamp": datetime.now().isoformat(),
            "station": {}
        }
        
        # Station status
        crew_size = 5000  # Default
        if station_status:
            crew_size = station_status.get('crew_size', 5000)
            context["station"] = {
                "overall_status": station_status.get('status', 'unknown'),
                "crew_size": crew_size,
                "location": station_status.get('station', {}).get('location', 'Jupiter Orbit'),
                "arduino_connected": station_status.get('arduino_connected', False)
            }
        
        # Sensors
        if telemetry:
            context["sensors"] = {
                "temperature": {
                    "value": telemetry.get('temperature'),
                    "unit": "°C",
                    "status": telemetry.get('statuses', {}).get('temperature', 'unknown')
                },
                "humidity": {
                    "value": telemetry.get('humidity'),
                    "unit": "%",
                    "status": telemetry.get('statuses', {}).get('humidity', 'unknown')
                },
                "pressure": {
                    "value": telemetry.get('pressure'),
                    "unit": "hPa",
                    "status": telemetry.get('statuses', {}).get('pressure', 'unknown')
                },
                "smoke_gas": {
                    "value": telemetry.get('smoke'),
                    "unit": "%",
                    "status": telemetry.get('statuses', {}).get('smoke', 'unknown')
                },
                "carbon_monoxide": {
                    "value": telemetry.get('co'),
                    "unit": "%",
                    "status": telemetry.get('statuses', {}).get('co', 'unknown')
                }
            }
            context["sensors"]["last_update"] = telemetry.get('timestamp')
        
        # Alerts
        if alerts:
            unack_alerts = [a for a in alerts if not a.get('acknowledged')]
            context["alerts"] = {
                "total_unacknowledged": len(unack_alerts),
                "critical_count": len([a for a in unack_alerts if a.get('level') == 'critical']),
                "warning_count": len([a for a in unack_alerts if a.get('level') == 'warning']),
                "recent": unack_alerts[:5]
            }
        else:
            context["alerts"] = {
                "total_unacknowledged": 0,
                "critical_count": 0,
                "warning_count": 0,
                "recent": []
            }
        
        # Crew Health (based on nutrition data)
        if nutrition:
            reqs = nutrition.get('requirements', {})
            
            # Calculate deficits
            cal_current = reqs.get('calories', {}).get('current', 0)
            cal_optimal = reqs.get('calories', {}).get('optimal', 2500)
            cal_deficit = cal_optimal - cal_current if cal_current else 0
            
            prot_current = reqs.get('protein', {}).get('current', 0)
            prot_optimal = reqs.get('protein', {}).get('optimal', 100)
            prot_deficit = prot_optimal - prot_current if prot_current else 0
            
            water_current = reqs.get('water', {}).get('current', 0)
            water_optimal = reqs.get('water', {}).get('optimal', 2.0)
            water_deficit = water_optimal - water_current if water_current else 0
            
            vit_current = reqs.get('vitamins', {}).get('current', 0)
            vit_optimal = reqs.get('vitamins', {}).get('optimal', 100)
            vit_deficit = vit_optimal - vit_current if vit_current else 0
            
            # Determine nutrition status
            if cal_deficit > 300 or prot_deficit > 20 or water_deficit > 0.5:
                nutrition_status = "critical"
            elif cal_deficit > 200 or prot_deficit > 15 or water_deficit > 0.3 or vit_deficit > 10:
                nutrition_status = "deficient"
            else:
                nutrition_status = "adequate"
            
            context["crew_health"] = {
                "nutrition_status": nutrition_status,
                "calories": {
                    "current": cal_current,
                    "optimal": cal_optimal,
                    "deficit": round(cal_deficit, 0),
                    "unit": "kcal"
                },
                "protein": {
                    "current": prot_current,
                    "optimal": prot_optimal,
                    "deficit": round(prot_deficit, 1),
                    "unit": "g"
                },
                "hydration": {
                    "current": water_current,
                    "optimal": water_optimal,
                    "deficit": round(water_deficit, 2),
                    "unit": "L"
                },
                "vitamins": {
                    "current": vit_current,
                    "optimal": vit_optimal,
                    "deficit": round(vit_deficit, 0),
                    "unit": "%"
                }
            }
            
            # Today's diet/meal schedule
            meal_schedule = nutrition.get('meal_schedule', [])
            if meal_schedule:
                context["diet_today"] = {
                    "meals": [
                        {
                            "time": m.get('time'),
                            "meal": m.get('meal'),
                            "menu": m.get('menu'),
                            "icon": m.get('icon', '')
                        } for m in meal_schedule
                    ],
                    "total_planned_calories": cal_optimal
                }
        
        # Power
        if power:
            context["power"] = {
                "total_output_mw": power.get('generation'),
                "consumption_mw": power.get('consumption'),
                "available_mw": power.get('available'),
                "efficiency_percent": power.get('percentage'),
                "satellites": {
                    "online": power.get('satellites', {}).get('online_count'),
                    "total": power.get('satellites', {}).get('total_count')
                }
            }
        
        # Tasks - include names for detailed responses
        if tasks:
            pending_tasks = [t for t in tasks if t.get('status') == 'pending']
            in_progress_tasks = [t for t in tasks if t.get('status') == 'in_progress']
            context["tasks"] = {
                "pending": len(pending_tasks),
                "in_progress": len(in_progress_tasks),
                "completed": len([t for t in tasks if t.get('status') == 'completed']),
                "pending_list": [{"name": t.get('name'), "priority": t.get('priority'), "category": t.get('category')} for t in pending_tasks],
                "in_progress_list": [{"name": t.get('name'), "priority": t.get('priority')} for t in in_progress_tasks]
            }
        
        return context, crew_size
    
    def chat(self, message, context, crew_size=5000):
        """Send message to AI with station context"""
        
        if not self.client:
            return self._demo_response(message, context)
        
        try:
            context_json = json.dumps(context, ensure_ascii=False, indent=2)
            system_message = SYSTEM_PROMPT.format(context=context_json, crew_size=crew_size)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": message}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            return {
                "success": True,
                "response": ai_response,
                "context_summary": self._summarize_context(context)
            }
            
        except Exception as e:
            print(f"[AI] Error generating response: {e}")
            return {
                "success": False,
                "response": f"AI Error: {str(e)}. Please check the OpenAI API key.",
                "context_summary": self._summarize_context(context)
            }
    
    def _demo_response(self, message, context):
        """Generate demo response when API is not available"""
        
        status = context.get('station', {}).get('overall_status', 'unknown')
        alerts_count = context.get('alerts', {}).get('total_unacknowledged', 0)
        critical_count = context.get('alerts', {}).get('critical_count', 0)
        
        msg_lower = message.lower()
        
        # Check for Russian keywords too
        is_status_query = any(kw in msg_lower for kw in ['status', 'state', 'station', 'статус', 'состояние', 'база', 'станция'])
        is_danger_query = any(kw in msg_lower for kw in ['danger', 'critical', 'alert', 'warning', 'threat', 'опасн', 'угроз', 'критич', 'тревог'])
        is_diet_query = any(kw in msg_lower for kw in ['diet', 'nutrition', 'food', 'meal', 'диет', 'питан', 'еда', 'рацион'])
        is_power_query = any(kw in msg_lower for kw in ['power', 'energy', 'satellite', 'энерг', 'питан', 'спутник'])
        is_task_query = any(kw in msg_lower for kw in ['task', 'todo', 'work', 'задач', 'работ', 'дел'])
        is_health_query = any(kw in msg_lower for kw in ['health', 'crew', 'здоров', 'экипаж', 'показател'])
        
        if is_status_query:
            sensors = context.get('sensors', {})
            arduino = context.get('station', {}).get('arduino_connected', False)
            response = f"""## 📊 Station Status: **{status.upper()}**

### Sensor Readings:
| Sensor | Value | Status |
|--------|-------|--------|
| 🌡️ Temperature | {sensors.get('temperature', {}).get('value', 'N/A')}°C | {sensors.get('temperature', {}).get('status', 'N/A').upper()} |
| 💧 Humidity | {sensors.get('humidity', {}).get('value', 'N/A')}% | {sensors.get('humidity', {}).get('status', 'N/A').upper()} |
| 📊 Pressure | {sensors.get('pressure', {}).get('value', 'N/A')} hPa | {sensors.get('pressure', {}).get('status', 'N/A').upper()} |
| 💨 Gas/Smoke | {sensors.get('smoke_gas', {}).get('value', 'N/A')}% | {sensors.get('smoke_gas', {}).get('status', 'N/A').upper()} |
| ⚠️ CO Level | {sensors.get('carbon_monoxide', {}).get('value', 'N/A')}% | {sensors.get('carbon_monoxide', {}).get('status', 'N/A').upper()} |

**Arduino Connected:** {'✅ Yes' if arduino else '❌ No (Demo Mode)'}
**Active Alerts:** {alerts_count}

_For full AI analysis, add OPENAI_API_KEY to .env file._"""
        
        elif is_danger_query:
            if critical_count > 0:
                recent = context.get('alerts', {}).get('recent', [])
                alert_list = "\n".join([f"- **{a.get('level', '').upper()}**: {a.get('message', 'Unknown')}" for a in recent[:3]])
                response = f"""⚠️ **DANGER DETECTED**

**Critical Alerts:** {critical_count}
**Total Unacknowledged:** {alerts_count}

### Recent Alerts:
{alert_list}

**Recommended Action:** Check the Alerts tab immediately and address critical issues."""
            elif alerts_count > 0:
                response = f"""⚠️ **{alerts_count} warning(s) detected.**

No critical dangers, but some readings require attention.
Check the Alerts tab for details."""
            else:
                response = """✅ **No dangerous readings detected.**

All sensor values are within normal ranges. Station is operating nominally."""
        
        elif is_diet_query or is_health_query:
            health = context.get('crew_health', {})
            diet = context.get('diet_today', {})
            
            nut_status = health.get('nutrition_status', 'unknown')
            status_icon = '✅' if nut_status == 'adequate' else '⚠️' if nut_status == 'deficient' else '🔴'
            
            meals_text = ""
            if diet.get('meals'):
                meals_text = "\n### Today's Menu:\n"
                for m in diet.get('meals', []):
                    meals_text += f"- **{m.get('time')}** {m.get('icon', '')} {m.get('meal')}: {m.get('menu')}\n"
            
            response = f"""## 👨‍⚕️ Crew Health Analysis

**Nutrition Status:** {status_icon} {nut_status.upper()}

### Daily Intake:
| Nutrient | Current | Optimal | Deficit |
|----------|---------|---------|---------|
| Calories | {health.get('calories', {}).get('current', 'N/A')} kcal | {health.get('calories', {}).get('optimal', 2500)} kcal | {health.get('calories', {}).get('deficit', 0)} |
| Protein | {health.get('protein', {}).get('current', 'N/A')} g | {health.get('protein', {}).get('optimal', 100)} g | {health.get('protein', {}).get('deficit', 0)} |
| Water | {health.get('hydration', {}).get('current', 'N/A')} L | {health.get('hydration', {}).get('optimal', 2.0)} L | {health.get('hydration', {}).get('deficit', 0)} |
| Vitamins | {health.get('vitamins', {}).get('current', 'N/A')}% | {health.get('vitamins', {}).get('optimal', 100)}% | {health.get('vitamins', {}).get('deficit', 0)} |
{meals_text}
**Recommendation:** Maintain optimal hydration levels and monitor protein intake."""
        
        elif is_power_query:
            pwr = context.get('power', {})
            response = f"""## ⚡ Power System Status

| Parameter | Value |
|-----------|-------|
| Generation | {pwr.get('total_output_mw', 'N/A')} MW |
| Consumption | {pwr.get('consumption_mw', 'N/A')} MW |
| Available | {pwr.get('available_mw', 'N/A')} MW |
| Efficiency | {pwr.get('efficiency_percent', 'N/A')}% |

### Satellite Network:
- **Online:** {pwr.get('satellites', {}).get('online', 'N/A')} / {pwr.get('satellites', {}).get('total', 'N/A')}

Power systems are operating within normal parameters."""
        
        elif is_task_query:
            tasks_data = context.get('tasks', {})
            pending = tasks_data.get('pending', 0)
            in_progress = tasks_data.get('in_progress', 0)
            completed = tasks_data.get('completed', 0)
            pending_list = tasks_data.get('pending_list', [])
            in_progress_list = tasks_data.get('in_progress_list', [])
            
            if pending == 0 and in_progress == 0:
                response = "✅ **All tasks completed!** Great work, crew! ✨"
            else:
                lines = ["## 📋 Task Overview\n"]
                if in_progress > 0:
                    lines.append(f"### 🔄 In Progress ({in_progress}):")
                    for t in in_progress_list[:5]:
                        lines.append(f"- {t.get('name', 'Unnamed')} `[{t.get('priority', 'Medium')}]`")
                if pending > 0:
                    lines.append(f"\n### ⏳ Pending ({pending}):")
                    for t in pending_list[:5]:
                        lines.append(f"- {t.get('name', 'Unnamed')} `[{t.get('priority', 'Medium')}]` — {t.get('category', '')}")
                if completed > 0:
                    lines.append(f"\n✅ **Completed:** {completed}")
                response = "\n".join(lines)
        
        else:
            response = f"""## 👋 Hello, Crew!

Station is currently **{status.upper()}** — all systems operational.

I can help you analyze:
- **Station status** — sensors, environment
- **Danger check** — alerts and warnings
- **Crew health** — nutrition analysis
- **Diet** — today's meal schedule
- **Power** — satellite network
- **Tasks** — your to-do list

Just ask me anything!

_For full AI capabilities, add OPENAI_API_KEY to the backend .env file._"""
        
        return {
            "success": True,
            "response": response,
            "context_summary": self._summarize_context(context)
        }
    
    def _summarize_context(self, context):
        """Create summary of station context"""
        return {
            "status": context.get('station', {}).get('overall_status', 'unknown'),
            "alerts": context.get('alerts', {}).get('total_unacknowledged', 0),
            "sensors_ok": all(
                s.get('status') == 'nominal' 
                for s in context.get('sensors', {}).values() 
                if isinstance(s, dict) and 'status' in s
            )
        }


_ai_companion = None

def get_ai_companion():
    """Get or create AI companion instance"""
    global _ai_companion
    if _ai_companion is None:
        _ai_companion = AICompanion()
    return _ai_companion
