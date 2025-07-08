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

if __name__ == '__main__':
    app.run(debug=True)
