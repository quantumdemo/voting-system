from flask import Flask, render_template, request, jsonify
import json, os, random, datetime

app = Flask(__name__)

VOTERS_FILE = 'voters.json'
VOTES_FILE = 'votes.json'
CONTACTS_FILE = 'contacts.json'

# In-memory store for active OTPs
# Structure: {'VIN001': {'otp': '123456', 'timestamp': datetime_object, 'phone_last4': '0001'}}
active_otps = {}
OTP_EXPIRY_MINUTES = 5

def load_json_file(file_path, default_value=None):
    if default_value is None:
        default_value = [] # Default to empty list if not specified
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                app.logger.error(f"Error decoding JSON from {file_path}")
                return default_value
    return default_value

def save_json_file(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

def load_voters():
    return load_json_file(VOTERS_FILE, [])

def load_votes():
    return load_json_file(VOTES_FILE, [])

def save_votes(votes):
    save_json_file(VOTES_FILE, votes)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/submit_contact', methods=['POST'])
def contact():
    data = request.get_json()
    if not data or not all(k in data for k in ("name", "email", "message")): # Ensure data is not None
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    existing_contacts = load_json_file(CONTACTS_FILE, [])
    existing_contacts.append(data)
    save_json_file(CONTACTS_FILE, existing_contacts)

    return jsonify({"status": "success", "message": "Submission received."})

@app.route('/request_otp', methods=['POST'])
def request_otp():
    data = request.get_json()
    if not data or 'vin' not in data:
        return jsonify({"status": "error", "message": "VIN is required."}), 400

    vin_to_check = data['vin']
    phone_to_check = data.get('phone') # Optional phone number from form

    voters = load_voters()
    voter_info = None
    for v in voters:
        if v.get('vin') == vin_to_check:
            # If phone is provided in request, it must match the registered phone
            if phone_to_check and v.get('phone') != phone_to_check:
                return jsonify({"status": "error", "message": "VIN and Phone number do not match registered records."}), 400
            voter_info = v
            break

    if not voter_info:
        return jsonify({"status": "error", "message": "VIN not found or does not match registered phone."}), 404

    # Clean up expired OTPs first
    now = datetime.datetime.utcnow()
    expired_vins = [
        vin for vin, otp_data in list(active_otps.items()) # list() to avoid runtime dict modification error
        if now > otp_data['timestamp'] + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)
    ]
    for vin in expired_vins:
        del active_otps[vin]
        app.logger.info(f"Expired OTP for VIN {vin} removed.")

    # For this demo, allow generating a new OTP even if one exists and is not expired.
    # In a real scenario, you might prevent rapid re-requests.

    otp_code = str(random.randint(100000, 999999))
    active_otps[vin_to_check] = {
        'otp': otp_code,
        'timestamp': now,
        'phone_last4': voter_info.get('phone', 'XXXX')[-4:]
    }
    app.logger.info(f"Generated OTP {otp_code} for VIN {vin_to_check}")

    return jsonify({
        "status": "success",
        "message": f"OTP (simulated) generated for VIN {vin_to_check}. For testing, OTP is {otp_code}. It would be sent to ...{active_otps[vin_to_check]['phone_last4']}.",
        "otp_for_testing": otp_code, # Clearly mark for testing
        "phone_last4": active_otps[vin_to_check]['phone_last4']
    })

@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    data = request.get_json()
    if not data or not all(k in data for k in ("vin", "otp", "candidate")):
        return jsonify({"status": "error", "message": "Missing required fields (vin, otp, candidate)."}), 400

    vin = data['vin']
    otp_received = data['otp']
    candidate = data['candidate']

    if not vin or not otp_received or not candidate or candidate == "Select a candidate":
        return jsonify({"status": "error", "message": "All fields must be filled and a candidate selected."}), 400

    # Validate OTP
    now = datetime.datetime.utcnow()
    otp_data = active_otps.get(vin)

    if not otp_data:
        return jsonify({"status": "error", "message": "No OTP request found for this VIN or OTP was not generated. Please request an OTP first."}), 400

    if now > otp_data['timestamp'] + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES):
        del active_otps[vin] # Clean up expired OTP
        app.logger.info(f"Attempt to use expired OTP for VIN {vin}.")
        return jsonify({"status": "error", "message": "OTP has expired. Please request a new one."}), 400

    if otp_data['otp'] != otp_received:
        return jsonify({"status": "error", "message": "Invalid OTP."}), 400

    # OTP is valid, proceed with voting logic
    votes = load_votes()

    # Check if VIN has already voted
    for vote_record in votes: # Renamed 'vote' to 'vote_record' to avoid conflict
        if vote_record.get('vin') == vin:
            return jsonify({"status": "error", "message": f"VIN {vin} has already voted."}), 409 # 409 Conflict

    new_vote = {
        "vin": vin,
        "candidate": candidate,
        "timestamp": now.isoformat() # Use current time for vote timestamp
    }
    votes.append(new_vote)
    save_votes(votes)

    # Invalidate OTP after successful use
    del active_otps[vin]
    app.logger.info(f"OTP for VIN {vin} used successfully and invalidated.")

    return jsonify({"status": "success", "message": "Vote submitted successfully."})

@app.route('/get_results', methods=['GET'])
def get_results():
    votes = load_votes()
    results = {}
    for vote in votes:
        candidate = vote.get('candidate')
        if candidate:
            results[candidate] = results.get(candidate, 0) + 1
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
