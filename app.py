from flask import Flask, render_template, request, jsonify
import json, os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/submit_contact', methods=['POST'])
def contact():
    data = request.get_json()
    if not all(k in data for k in ("name", "email", "message")):
        return jsonify({"status": "error", "message": "Missing required fields."}), 400

    file_path = 'contacts.json'
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            existing = json.load(f)
    else:
        existing = []

    existing.append(data)
    with open(file_path, 'w') as f:
        json.dump(existing, f, indent=2)

    return jsonify({"status": "success", "message": "Submission received."})

VOTES_FILE = 'votes.json'

def load_votes():
    if os.path.exists(VOTES_FILE):
        with open(VOTES_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_votes(votes):
    with open(VOTES_FILE, 'w') as f:
        json.dump(votes, f, indent=2)

@app.route('/submit_vote', methods=['POST'])
def submit_vote():
    data = request.get_json()
    if not data or not all(k in data for k in ("vin", "otp", "candidate")):
        return jsonify({"status": "error", "message": "Missing required fields (vin, otp, candidate)."}), 400

    vin = data['vin']
    otp = data['otp']
    candidate = data['candidate']

    # Basic validation (can be expanded)
    if not vin or not otp or not candidate:
        return jsonify({"status": "error", "message": "All fields must be filled."}), 400

    # In a real application, OTP would be validated against a generated & stored OTP
    # and VIN would be checked against a voter registration database.
    import datetime

    votes = load_votes()

    # Check if VIN has already voted
    for vote in votes:
        if vote.get('vin') == vin:
            return jsonify({"status": "error", "message": f"VIN {vin} has already voted."}), 409 # 409 Conflict

    new_vote = {
        "vin": vin,
        "candidate": candidate,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    votes.append(new_vote)
    save_votes(votes)

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
