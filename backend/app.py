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
# Get the absolute path to the config file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.getenv('CONFIG_PATH', os.path.join(BASE_DIR, 'config', 'mission_config.yaml'))
with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# In-memory storage
alerts = []
tasks = []
telemetry_history = []
current_telemetry = None  # Store real-time telemetry from Arduino

def generate_telemetry():
    """Generate realistic telemetry data based on config"""
    env_config = config['environment']
    
    return {
        'timestamp': datetime.now().isoformat(),
        'temperature': round(env_config['temperature']['optimal'] + random.uniform(-1, 1), 2),
        'oxygen': round(env_config['oxygen']['optimal'] + random.uniform(-0.5, 0.5), 2),
        'co2': round(env_config['co2']['optimal'] + random.uniform(-0.01, 0.02), 3),
        'humidity': round(env_config['humidity']['optimal'] + random.uniform(-5, 5), 2),
        'co': round(env_config['co']['optimal'] + random.uniform(-30, 100), 1)
    }

def generate_power_data():
    """Generate power system data - Satellite-based solar power only"""
    power_config = config['power']
    total_capacity = power_config['total_capacity']
    
    # Generate satellite power data (primary and only power source)
    satellite_config = power_config.get('satellites', {})
    total_satellites = satellite_config['total_count']
    power_per_sat = satellite_config['power_per_satellite']
    max_capacity = satellite_config.get('max_capacity', total_capacity)
    
    # All satellites operational at full capacity (100% efficiency)
    online_satellites = total_satellites
    satellite_power = round(online_satellites * power_per_sat, 3)
    total_generation = satellite_power
    
    # Calculate status (all nominal at 100%)
    online_ratio = online_satellites / total_satellites
    if online_ratio < satellite_config['critical_threshold']:
        sat_status = 'critical'
    elif online_ratio < satellite_config['warning_threshold']:
        sat_status = 'warning'
    else:
        sat_status = 'nominal'
    
    # 100% uptime
    uptime = 100.0
    
    satellites = {
        'total_count': total_satellites,
        'online_count': online_satellites,
        'power_per_satellite': power_per_sat,
        'total_output': satellite_power,
        'max_capacity': max_capacity,
        'average_output': round(power_per_sat, 6),  # Average per satellite in MW
        'efficiency': 100.0,
        'uptime': uptime,
        'status': sat_status
    }
    
    # System power distribution
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

def check_alerts(telemetry):
    """Check telemetry for alert conditions"""
    env_config = config['environment']
    new_alerts = []
    
    for param, value in telemetry.items():
        if param in env_config and param != 'timestamp':
            param_config = env_config[param]
            optimal = param_config['optimal']
            threshold = param_config['alert_threshold']
            
            if abs(value - optimal) > threshold:
                level = 'critical' if abs(value - optimal) > threshold * 1.5 else 'warning'
                alert = {
                    'id': len(alerts) + len(new_alerts) + 1,
                    'timestamp': datetime.now().isoformat(),
                    'level': level,
                    'system': 'Environment',
                    'parameter': param,
                    'message': f'{param.capitalize()} is {value}{param_config["unit"]} (optimal: {optimal}{param_config["unit"]})',
                    'acknowledged': False
                }
                new_alerts.append(alert)
    
    return new_alerts

# API Routes
@app.route('/api/config', methods=['GET'])
def get_config():
    """Get mission configuration"""
    return jsonify(config)

@app.route('/api/telemetry', methods=['GET'])
def get_telemetry():
    """Get current telemetry data"""
    # Use real telemetry from Arduino if available, otherwise generate
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    # Check for alerts
    new_alerts = check_alerts(telemetry)
    alerts.extend(new_alerts)
    
    # Keep only last 100 alerts
    if len(alerts) > 100:
        alerts[:] = alerts[-100:]
    
    return jsonify(telemetry)

@app.route('/api/telemetry/arduino', methods=['POST'])
def receive_arduino_telemetry():
    """Receive telemetry data from Arduino sensor module"""
    global current_telemetry
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['temperature', 'humidity', 'co2', 'oxygen', 'co']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Store telemetry data
        current_telemetry = {
            'timestamp': datetime.now().isoformat(),
            'temperature': float(data.get('temperature', 0)),
            'humidity': float(data.get('humidity', 0)),
            'co2': float(data.get('co2', 0)),
            'oxygen': float(data.get('oxygen', 0)),
            'co': float(data.get('co', 0))
        }
        
        # Add to history (keep last 1000 readings)
        telemetry_history.append(current_telemetry.copy())
        if len(telemetry_history) > 1000:
            telemetry_history[:] = telemetry_history[-1000:]
        
        # Check for alerts
        new_alerts = check_alerts(current_telemetry)
        alerts.extend(new_alerts)
        
        # Emit real-time update via WebSocket
        socketio.emit('telemetry_update', current_telemetry)
        
        return jsonify({'success': True, 'message': 'Telemetry received'}), 200
        
    except Exception as e:
        print(f"Error receiving Arduino telemetry: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/power', methods=['GET'])
def get_power():
    """Get power system data"""
    return jsonify(generate_power_data())

@app.route('/api/nutrition', methods=['GET'])
def get_nutrition():
    """Get nutrition data"""
    nutrition_config = config['nutrition']
    
    # Generate stable nutrition values with minimal variation
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
    
    # Get meal schedule
    meal_schedule = nutrition_config.get('meal_schedule', [])
    
    # Calculate storage status with days remaining
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
            return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Alert not found'}), 404

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

@app.route('/api/station/status', methods=['GET'])
def get_station_status():
    """Get overall station status"""
    # Use real telemetry if available, otherwise generate
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    power = generate_power_data()
    
    # Determine overall status
    unacknowledged_critical = sum(1 for a in alerts if not a['acknowledged'] and a['level'] == 'critical')
    
    if unacknowledged_critical > 0:
        status = 'critical'
    elif power['percentage'] < config['power']['warning_threshold']:
        status = 'warning'
    else:
        status = 'nominal'
    
    return jsonify({
        'status': status,
        'station': config['station'],
        'crew_size': config['station']['crew_size'],
        'active_alerts': len([a for a in alerts if not a['acknowledged']]),
        'pending_tasks': len([t for t in tasks if t['status'] == 'pending']),
        'power_status': power['percentage'],
        'power_available': power['available'],
        'comm_status': 'nominal',
        'environment_status': 'nominal' if not unacknowledged_critical else 'alert'
    })

# WebSocket events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'data': 'Connected to Icarus Station'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_update')
def handle_update_request():
    """Send real-time updates to client"""
    # Use real telemetry if available, otherwise generate
    if current_telemetry:
        telemetry = current_telemetry.copy()
    else:
        telemetry = generate_telemetry()
    
    power = generate_power_data()
    
    emit('telemetry_update', telemetry)
    emit('power_update', power)

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
    
    port = int(os.getenv('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
