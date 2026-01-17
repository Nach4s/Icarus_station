from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import yaml
import os
from datetime import datetime
import random
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Load mission configuration
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.getenv('CONFIG_PATH', os.path.join(BASE_DIR, 'config', 'mission_config.yaml'))
with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# =============================================================================
# SENSOR THRESHOLDS - Real sensors from Arduino
# =============================================================================
SENSOR_THRESHOLDS = {
    'temperature': {
        'min': 15.0,
        'max': 35.0,
        'critical_min': 10.0,
        'critical_max': 40.0,
        'optimal': 22.0,
        'unit': '°C',
        'name': 'Temperature',
        'icon': 'thermometer'
    },
    'humidity': {
        'min': 30.0,
        'max': 70.0,
        'critical_min': 20.0,
        'critical_max': 85.0,
        'optimal': 50.0,
        'unit': '%',
        'name': 'Humidity',
        'icon': 'droplets'
    },
    'pressure': {
        'min': 950.0,
        'max': 1050.0,
        'critical_min': 900.0,
        'critical_max': 1100.0,
        'optimal': 1013.25,
        'unit': 'hPa',
        'name': 'Pressure',
        'icon': 'gauge'
    },
    'smoke': {
        'min': 0,
        'max': 30,
        'critical_min': 0,
        'critical_max': 50,
        'optimal': 0,
        'unit': '%',
        'name': 'Smoke/Gas (MQ-2)',
        'icon': 'cloud'
    },
    'co': {
        'min': 0,
        'max': 30,
        'critical_min': 0,
        'critical_max': 50,
        'optimal': 0,
        'unit': '%',
        'name': 'CO (MQ-7)',
        'icon': 'alert-triangle'
    }
}

# In-memory storage
alerts = []
tasks = []
telemetry_history = []
current_telemetry = None  # Store real-time telemetry from Arduino

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def create_alert(level, parameter, value, thresholds):
    """Create a new alert object"""
    return {
        'id': len(alerts) + 1,
        'timestamp': datetime.now().isoformat(),
        'level': level,
        'system': 'Sensors',
        'parameter': parameter,
        'value': value,
        'message': f'{thresholds["name"]} = {value}{thresholds["unit"]} (normal: {thresholds["min"]}-{thresholds["max"]}{thresholds["unit"]})',
        'acknowledged': False
    }

def check_sensor_alerts(data):
    """Check sensor values against thresholds and generate alerts"""
    new_alerts = []
    
    for param, value in data.items():
        if param in SENSOR_THRESHOLDS and param != 'timestamp':
            thresholds = SENSOR_THRESHOLDS[param]
            
            # For smoke and co, only check upper bounds (lower is better)
            if param in ['smoke', 'co']:
                if value >= thresholds['critical_max']:
                    alert = create_alert('critical', param, value, thresholds)
                    new_alerts.append(alert)
                elif value >= thresholds['max']:
                    alert = create_alert('warning', param, value, thresholds)
                    new_alerts.append(alert)
            else:
                # For temp, humidity, pressure - check both bounds
                if value <= thresholds['critical_min'] or value >= thresholds['critical_max']:
                    alert = create_alert('critical', param, value, thresholds)
                    new_alerts.append(alert)
                elif value <= thresholds['min'] or value >= thresholds['max']:
                    alert = create_alert('warning', param, value, thresholds)
                    new_alerts.append(alert)
    
    return new_alerts

def get_sensor_status(value, param):
    """Get status string for a sensor value"""
    if param not in SENSOR_THRESHOLDS:
        return 'unknown'
    
    thresholds = SENSOR_THRESHOLDS[param]
    
    if param in ['smoke', 'co']:
        if value >= thresholds['critical_max']:
            return 'critical'
        elif value >= thresholds['max']:
            return 'warning'
        else:
            return 'nominal'
    else:
        if value <= thresholds['critical_min'] or value >= thresholds['critical_max']:
            return 'critical'
        elif value <= thresholds['min'] or value >= thresholds['max']:
            return 'warning'
        else:
            return 'nominal'

def generate_telemetry():
    """Generate demo telemetry data (used when Arduino is not connected)"""
    return {
        'timestamp': datetime.now().isoformat(),
        'temperature': round(22.0 + random.uniform(-2, 2), 1),
        'humidity': round(50.0 + random.uniform(-5, 5), 1),
        'pressure': round(1013.25 + random.uniform(-5, 5), 2),
        'smoke': round(random.uniform(0, 15)),
        'co': round(random.uniform(0, 10))
    }

def generate_power_data():
    """Generate power system data"""
    power_config = config['power']
    total_capacity = power_config['total_capacity']
    
    satellite_config = power_config.get('satellites', {})
    total_satellites = satellite_config['total_count']
    power_per_sat = satellite_config['power_per_satellite']
    max_capacity = satellite_config.get('max_capacity', total_capacity)
    
    online_satellites = total_satellites
    satellite_power = round(online_satellites * power_per_sat, 3)
    total_generation = satellite_power
    
    online_ratio = online_satellites / total_satellites
    if online_ratio < satellite_config['critical_threshold']:
        sat_status = 'critical'
    elif online_ratio < satellite_config['warning_threshold']:
        sat_status = 'warning'
    else:
        sat_status = 'nominal'
    
    uptime = 100.0
    
    satellites = {
        'total_count': total_satellites,
        'online_count': online_satellites,
        'power_per_satellite': power_per_sat,
        'total_output': satellite_power,
        'max_capacity': max_capacity,
        'average_output': round(power_per_sat, 6),
        'efficiency': 100.0,
        'uptime': uptime,
        'status': sat_status
    }
    
    systems = []
    total_consumption = 0
    for system in power_config['systems']:
        current = round(system['power_draw'] * random.uniform(0.98, 1.02), 4)
        total_consumption += current
        systems.append({
            'name': system['name'],
            'priority': system['priority'],
            'allocated': system['power_draw'],
            'current': current
        })
    
    return {
        'timestamp': datetime.now().isoformat(),
        'total_capacity': total_capacity,
        'generation': round(total_generation, 3),
        'consumption': round(total_consumption, 3),
        'available': round(total_generation - total_consumption, 3),
        'percentage': round((total_generation / total_capacity) * 100, 2),
        'satellites': satellites,
        'systems': systems
    }

# =============================================================================
# API ROUTES - SENSORS
# =============================================================================

@app.route('/api/sensors', methods=['POST'])
def receive_sensor_data():
    """Receive real sensor data from Arduino ESP8266"""
    global current_telemetry
    
    try:
        data = request.json
        print(f"[ARDUINO] Received sensor data: {data}")
        
        # Store telemetry with real sensor data
        current_telemetry = {
            'timestamp': datetime.now().isoformat(),
            'temperature': float(data.get('temperature', 0)),
            'humidity': float(data.get('humidity', 0)),
            'pressure': float(data.get('pressure', 0)),
            'smoke': int(data.get('smoke', 0)),
            'co': int(data.get('co', 0))
        }
        
        # Add to history (keep last 1000 readings)
        telemetry_history.append(current_telemetry.copy())
        if len(telemetry_history) > 1000:
            telemetry_history[:] = telemetry_history[-1000:]
        
        # Check for alerts
        new_alerts = check_sensor_alerts(current_telemetry)
        if new_alerts:
            print(f"[ALERT] New alerts generated: {len(new_alerts)}")
            alerts.extend(new_alerts)
            # Keep only last 100 alerts
            if len(alerts) > 100:
                alerts[:] = alerts[-100:]
        
        # Emit real-time update via WebSocket
        socketio.emit('telemetry_update', current_telemetry)
        
        # Also emit alerts if any new ones
        if new_alerts:
            socketio.emit('alerts_update', alerts)
        
        return jsonify({'success': True, 'message': 'Sensor data received'}), 200
        
    except Exception as e:
        print(f"[ERROR] Failed to process sensor data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/telemetry', methods=['GET'])
def get_telemetry():
    """Get current telemetry data"""
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    # Add status for each sensor
    telemetry['statuses'] = {}
    for param in SENSOR_THRESHOLDS.keys():
        if param in telemetry:
            telemetry['statuses'][param] = get_sensor_status(telemetry[param], param)
    
    return jsonify(telemetry)

@app.route('/api/telemetry/history', methods=['GET'])
def get_telemetry_history():
    """Get telemetry history for charts"""
    limit = request.args.get('limit', 100, type=int)
    return jsonify(telemetry_history[-limit:])

@app.route('/api/thresholds', methods=['GET'])
def get_thresholds():
    """Get sensor thresholds configuration"""
    return jsonify(SENSOR_THRESHOLDS)

# =============================================================================
# API ROUTES - CONFIG & STATUS
# =============================================================================

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get mission configuration"""
    return jsonify(config)

@app.route('/api/power', methods=['GET'])
def get_power():
    """Get power system data"""
    return jsonify(generate_power_data())

@app.route('/api/nutrition', methods=['GET'])
def get_nutrition():
    """Get nutrition data"""
    nutrition_config = config['nutrition']
    
    requirements = nutrition_config['daily_requirements']
    current_nutrition = {
        'calories': {
            'optimal': requirements['calories']['optimal'],
            'current': round(requirements['calories'].get('current_baseline', requirements['calories']['optimal']) + random.uniform(-20, 20), 0),
            'unit': requirements['calories']['unit'],
            'warning_threshold': requirements['calories']['warning_threshold']
        },
        'protein': {
            'optimal': requirements['protein']['optimal'],
            'current': round(requirements['protein'].get('current_baseline', requirements['protein']['optimal']) + random.uniform(-2, 2), 1),
            'unit': requirements['protein']['unit'],
            'warning_threshold': requirements['protein']['warning_threshold']
        },
        'water': {
            'optimal': requirements['water']['optimal'],
            'current': round(requirements['water'].get('current_baseline', requirements['water']['optimal']) + random.uniform(-0.05, 0.05), 2),
            'unit': requirements['water']['unit'],
            'warning_threshold': requirements['water']['warning_threshold']
        },
        'vitamins': {
            'optimal': requirements['vitamins']['optimal'],
            'current': round(requirements['vitamins'].get('current_baseline', requirements['vitamins']['optimal']) + random.uniform(-3, 3), 0),
            'unit': requirements['vitamins']['unit'],
            'warning_threshold': requirements['vitamins']['warning_threshold']
        }
    }
    
    meal_schedule = nutrition_config.get('meal_schedule', [])
    
    storage_status = []
    for item in nutrition_config['storage']:
        if item['daily_consumption'] > 0:
            days_remaining = round(item['quantity'] / item['daily_consumption'], 1)
        else:
            days_remaining = None
        
        storage_status.append({
            'name': item['name'],
            'icon': item['icon'],
            'quantity': item['quantity'],
            'unit': item['unit'],
            'days_remaining': days_remaining,
            'critical_days': item['critical_days'],
            'status': 'critical' if days_remaining and days_remaining <= item['critical_days'] else 
                     'warning' if days_remaining and days_remaining <= item['critical_days'] * 2 else 
                     'nominal'
        })
    
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'requirements': current_nutrition,
        'meal_schedule': meal_schedule,
        'storage': storage_status,
        'systems': nutrition_config['systems'],
        'last_check': '2 days ago'
    })

# =============================================================================
# API ROUTES - ALERTS
# =============================================================================

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get all alerts"""
    return jsonify(alerts)

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    for alert in alerts:
        if alert['id'] == alert_id:
            alert['acknowledged'] = True
            socketio.emit('alerts_update', alerts)
            return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Alert not found'}), 404

@app.route('/api/alerts/clear', methods=['POST'])
def clear_acknowledged_alerts():
    """Clear all acknowledged alerts"""
    global alerts
    alerts = [a for a in alerts if not a['acknowledged']]
    socketio.emit('alerts_update', alerts)
    return jsonify({'success': True})

# =============================================================================
# API ROUTES - TASKS
# =============================================================================

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks"""
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    data = request.json
    task = {
        'id': len(tasks) + 1,
        'name': data.get('name'),
        'category': data.get('category'),
        'priority': data.get('priority'),
        'duration': data.get('duration'),
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    tasks.append(task)
    return jsonify(task), 201

@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task(task_id):
    """Update task status"""
    data = request.json
    for task in tasks:
        if task['id'] == task_id:
            task.update(data)
            return jsonify(task)
    return jsonify({'error': 'Task not found'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    global tasks
    tasks = [t for t in tasks if t['id'] != task_id]
    return jsonify({'success': True})

# =============================================================================
# API ROUTES - STATION STATUS
# =============================================================================

@app.route('/api/station/status', methods=['GET'])
def get_station_status():
    """Get overall station status"""
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    power = generate_power_data()
    
    # Determine overall status based on alerts
    unacknowledged_critical = sum(1 for a in alerts if not a['acknowledged'] and a['level'] == 'critical')
    unacknowledged_warning = sum(1 for a in alerts if not a['acknowledged'] and a['level'] == 'warning')
    
    if unacknowledged_critical > 0:
        status = 'critical'
    elif unacknowledged_warning > 0:
        status = 'warning'
    elif power['percentage'] < config['power']['warning_threshold']:
        status = 'warning'
    else:
        status = 'nominal'
    
    # Calculate sensor status
    sensor_status = 'nominal'
    for param in SENSOR_THRESHOLDS.keys():
        if param in telemetry:
            s = get_sensor_status(telemetry[param], param)
            if s == 'critical':
                sensor_status = 'critical'
                break
            elif s == 'warning' and sensor_status != 'critical':
                sensor_status = 'warning'
    
    return jsonify({
        'status': status,
        'station': config['station'],
        'crew_size': config['station']['crew_size'],
        'active_alerts': len([a for a in alerts if not a['acknowledged']]),
        'critical_alerts': unacknowledged_critical,
        'warning_alerts': unacknowledged_warning,
        'pending_tasks': len([t for t in tasks if t['status'] == 'pending']),
        'power_status': power['percentage'],
        'power_available': power['available'],
        'comm_status': 'nominal',
        'environment_status': sensor_status,
        'arduino_connected': current_telemetry is not None,
        'last_update': current_telemetry['timestamp'] if current_telemetry else None
    })

# =============================================================================
# WEBSOCKET EVENTS
# =============================================================================

@socketio.on('connect')
def handle_connect():
    print('[SOCKET] Client connected')
    emit('connected', {'data': 'Connected to Icarus Station'})
    # Send current data immediately
    if current_telemetry:
        emit('telemetry_update', current_telemetry)
    emit('alerts_update', alerts)

@socketio.on('disconnect')
def handle_disconnect():
    print('[SOCKET] Client disconnected')

@socketio.on('request_update')
def handle_update_request():
    """Send real-time updates to client"""
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    # Add statuses
    telemetry['statuses'] = {}
    for param in SENSOR_THRESHOLDS.keys():
        if param in telemetry:
            telemetry['statuses'][param] = get_sensor_status(telemetry[param], param)
    
    power = generate_power_data()
    
    emit('telemetry_update', telemetry)
    emit('power_update', power)
    emit('alerts_update', alerts)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    # Initialize with default tasks from config
    for i, task_config in enumerate(config['tasks']['default_tasks']):
        tasks.append({
            'id': i + 1,
            'name': task_config['name'],
            'category': task_config['category'],
            'priority': task_config['priority'],
            'duration': task_config['duration'],
            'frequency': task_config['frequency'],
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        })
    
    print("=" * 50)
    print("  ICARUS STATION - Backend Server")
    print("=" * 50)
    print(f"  Sensor Endpoint: POST /api/sensors")
    print(f"  Telemetry:       GET  /api/telemetry")
    print(f"  Alerts:          GET  /api/alerts")
    print(f"  Thresholds:      GET  /api/thresholds")
    print("=" * 50)
    
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
