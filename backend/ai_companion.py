"""
AI Companion Module for Icarus Station
Provides intelligent analysis of station data and conversational interface.
"""

import os
import json
from datetime import datetime

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("[AI] Warning: google-generativeai not installed. AI features disabled.")


# System prompt for AI personality (English)
SYSTEM_PROMPT = """You are the AI Companion of "Icarus Station", a space station orbiting Jupiter.
Your role is to assist the crew by analyzing station systems and providing actionable insights.

BEHAVIOR RULES:
1. Respond calmly, professionally, with an engineering mindset
2. ALWAYS base your answers on the real data from the context below
3. If data is insufficient — state this clearly, never make up information
4. In critical situations — highlight warnings prominently
5. Provide specific recommendations with data sources
6. Respond in English
7. Use bullet points for structured answers

DATA INTERPRETATION:
- Temperature: normal 15-35°C, optimal 22°C
- Humidity: normal 30-70%, optimal 50%
- Pressure: normal 950-1050 hPa, optimal 1013 hPa
- Smoke/Gas (MQ-2): normal 0-30%, dangerous >50%
- CO (MQ-7): normal 0-30%, dangerous >50%

STATUS LEVELS:
- nominal = normal, all systems operational
- warning = attention required, monitor closely
- critical = immediate action required

CURRENT STATION CONTEXT:
{context}

Respond concisely and to the point. If there are issues — mention them first."""


class AICompanion:
    """AI Companion for station analysis and chat"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model = None
        
        if GEMINI_AVAILABLE and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                print("[AI] Gemini API initialized successfully")
            except Exception as e:
                print(f"[AI] Failed to initialize Gemini: {e}")
                self.model = None
        else:
            print("[AI] Running in demo mode (no API key)")
    
    def build_context(self, telemetry, alerts, nutrition, power, tasks, station_status):
        """Build comprehensive station context for AI"""
        
        context = {
            "timestamp": datetime.now().isoformat(),
            "station": {}
        }
        
        # Station status
        if station_status:
            context["station"] = {
                "overall_status": station_status.get('status', 'unknown'),
                "crew_size": station_status.get('crew_size', 0),
                "location": station_status.get('station', {}).get('location', 'Unknown'),
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
        
        # Nutrition
        if nutrition:
            reqs = nutrition.get('requirements', {})
            context["nutrition"] = {
                "calories": {
                    "current": reqs.get('calories', {}).get('current'),
                    "optimal": reqs.get('calories', {}).get('optimal'),
                    "unit": "kcal"
                },
                "protein": {
                    "current": reqs.get('protein', {}).get('current'),
                    "optimal": reqs.get('protein', {}).get('optimal'),
                    "unit": "g"
                },
                "water": {
                    "current": reqs.get('water', {}).get('current'),
                    "optimal": reqs.get('water', {}).get('optimal'),
                    "unit": "L"
                },
                "vitamins": {
                    "current": reqs.get('vitamins', {}).get('current'),
                    "optimal": reqs.get('vitamins', {}).get('optimal'),
                    "unit": "%"
                }
            }
        
        # Power
        if power:
            context["power"] = {
                "total_output_mw": power.get('generation'),
                "consumption_mw": power.get('consumption'),
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
        
        return context
    
    def chat(self, message, context):
        """Send message to AI with station context"""
        
        if not self.model:
            return self._demo_response(message, context)
        
        try:
            context_json = json.dumps(context, ensure_ascii=False, indent=2)
            full_prompt = SYSTEM_PROMPT.format(context=context_json) + f"\n\nCREW QUESTION: {message}"
            
            response = self.model.generate_content(full_prompt)
            
            return {
                "success": True,
                "response": response.text,
                "context_summary": self._summarize_context(context)
            }
            
        except Exception as e:
            print(f"[AI] Error generating response: {e}")
            return {
                "success": False,
                "response": f"AI Error: {str(e)}. Please check the API key.",
                "context_summary": self._summarize_context(context)
            }
    
    def _demo_response(self, message, context):
        """Generate demo response when API is not available"""
        
        status = context.get('station', {}).get('overall_status', 'unknown')
        alerts_count = context.get('alerts', {}).get('total_unacknowledged', 0)
        
        msg_lower = message.lower()
        
        if 'status' in msg_lower or 'state' in msg_lower or 'station' in msg_lower:
            sensors = context.get('sensors', {})
            response = f"""**Current Station Status: {status.upper()}**

📊 **Sensor Readings:**
- Temperature: {sensors.get('temperature', {}).get('value', 'N/A')}°C ({sensors.get('temperature', {}).get('status', 'N/A')})
- Humidity: {sensors.get('humidity', {}).get('value', 'N/A')}% ({sensors.get('humidity', {}).get('status', 'N/A')})
- Pressure: {sensors.get('pressure', {}).get('value', 'N/A')} hPa ({sensors.get('pressure', {}).get('status', 'N/A')})
- Gas/Smoke: {sensors.get('smoke_gas', {}).get('value', 'N/A')}% ({sensors.get('smoke_gas', {}).get('status', 'N/A')})
- CO Level: {sensors.get('carbon_monoxide', {}).get('value', 'N/A')}% ({sensors.get('carbon_monoxide', {}).get('status', 'N/A')})

⚠️ Active Alerts: {alerts_count}

_For full analysis, Gemini API key is required._"""
        
        elif 'danger' in msg_lower or 'critical' in msg_lower or 'alert' in msg_lower or 'warning' in msg_lower:
            if alerts_count > 0:
                response = f"⚠️ **{alerts_count} active alert(s) detected.**\n\nCheck the Alerts tab for details."
            else:
                response = "✅ **No dangerous readings detected.** All systems are nominal."
        
        elif 'diet' in msg_lower or 'nutrition' in msg_lower or 'food' in msg_lower or 'meal' in msg_lower:
            nutr = context.get('nutrition', {})
            response = f"""**Crew Nutrition Analysis:**

- Calories: {nutr.get('calories', {}).get('current', 'N/A')}/{nutr.get('calories', {}).get('optimal', 'N/A')} kcal
- Protein: {nutr.get('protein', {}).get('current', 'N/A')}/{nutr.get('protein', {}).get('optimal', 'N/A')} g
- Water: {nutr.get('water', {}).get('current', 'N/A')}/{nutr.get('water', {}).get('optimal', 'N/A')} L
- Vitamins: {nutr.get('vitamins', {}).get('current', 'N/A')}/{nutr.get('vitamins', {}).get('optimal', 'N/A')}%

_Recommendation: Maintain optimal water intake levels._"""
        
        elif 'power' in msg_lower or 'energy' in msg_lower or 'satellite' in msg_lower:
            pwr = context.get('power', {})
            response = f"""**Power System Status:**

- Generation: {pwr.get('total_output_mw', 'N/A')} MW
- Consumption: {pwr.get('consumption_mw', 'N/A')} MW
- Efficiency: {pwr.get('efficiency_percent', 'N/A')}%
- Satellites: {pwr.get('satellites', {}).get('online', 'N/A')}/{pwr.get('satellites', {}).get('total', 'N/A')} online"""
        
        elif 'task' in msg_lower or 'todo' in msg_lower or 'work' in msg_lower:
            tasks_data = context.get('tasks', {})
            pending = tasks_data.get('pending', 0)
            in_progress = tasks_data.get('in_progress', 0)
            completed = tasks_data.get('completed', 0)
            pending_list = tasks_data.get('pending_list', [])
            in_progress_list = tasks_data.get('in_progress_list', [])
            
            if pending == 0 and in_progress == 0:
                response = "Great news! You have no pending tasks. All caught up! ✨"
            else:
                lines = [f"Here's your task overview:"]
                if in_progress > 0:
                    lines.append(f"\n🔄 **In Progress ({in_progress}):**")
                    for t in in_progress_list[:5]:
                        lines.append(f"  • {t.get('name', 'Unnamed')} [{t.get('priority', 'Medium')}]")
                if pending > 0:
                    lines.append(f"\n⏳ **Pending ({pending}):**")
                    for t in pending_list[:5]:
                        lines.append(f"  • {t.get('name', 'Unnamed')} [{t.get('priority', 'Medium')}]")
                if completed > 0:
                    lines.append(f"\n✅ Completed: {completed}")
                response = "\n".join(lines)
        
        else:
            response = f"""Hey there! Station is currently **{status.upper()}** - all systems running smoothly.

What would you like to know about? I can help with:
• **Station status** - sensors, environment
• **Alerts** - any warnings or issues
• **Nutrition** - crew diet analysis
• **Power** - satellite network status
• **Tasks** - your to-do list

Just ask away!"""
        
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
