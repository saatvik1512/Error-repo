from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import shutil
from speechbrain.pretrained import SpeakerRecognition
import pyttsx3

engine = pyttsx3.init()

app = Flask(__name__)
CORS(app)

# Corrected paths based on your structure
UPLOAD_FOLDER = './audio_files'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

verification = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir=os.path.join('./', 'pretrained_models', 'spkrec-ecapa-voxceleb')
)

THRESHOLD = 0.3

def check_existing_voice(new_audio_path):
    best_score = -float('inf')
    best_user = None
    
    # Convert to POSIX path for SpeechBrain compatibility
    new_audio_posix = os.path.normpath(new_audio_path).replace('\\', '/')
    
    for user_file in os.listdir(UPLOAD_FOLDER):
        if user_file.startswith('temp_'):
            continue
            
        user_path = os.path.join(UPLOAD_FOLDER, user_file)
        try:
            user_posix = os.path.normpath(user_path).replace('\\', '/')
            
            # Debug print to verify paths
            print(f"Comparing: {user_posix} vs {new_audio_posix}")
            
            score, _ = verification.verify_files(user_posix, new_audio_posix)
            print(f"Match Score for {user_file}: {score}")  # Critical debug info
            
            if score > best_score:
                best_score = score
                best_user = user_file.split('.')[0]
                
        except Exception as e:
            print(f"Error processing {user_file}: {str(e)}")
            continue
            
    print(f"Best Match: {best_user} with score {best_score} (Threshold: {THRESHOLD})")
    return best_user, best_score


@app.route('/signup', methods=['POST'])
def signup():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    temp_path = os.path.join(UPLOAD_FOLDER, 'temp_signup.wav')
    try:
        # Save file directly without double-write
        request.files['audio'].save(temp_path)
        
        # Verify against existing users
        existing_user, score = check_existing_voice(temp_path)
        if existing_user and score > THRESHOLD:
            os.remove(temp_path)
            return jsonify({'error': 'You are already registered! Please sign in.'}), 409
        
        # Move to permanent storage
        user_id = str(uuid.uuid4())
        filename = f"{user_id}.wav"
        save_path = os.path.join(UPLOAD_FOLDER, filename)
        os.rename(temp_path, save_path)
        
        return jsonify({'message': 'Registration successful', 'userId': user_id}), 200
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/signin', methods=['POST', 'GET'])
def signin():
    print("Received Signin Request")
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    try:
        temp_path = os.path.join(UPLOAD_FOLDER, 'temp_signin.wav')
        request.files['audio'].save(temp_path)
        
        # Verify using normalized Windows paths
        temp_posix = os.path.normpath(temp_path).replace('\\', '/')
        closest_user, score = check_existing_voice(temp_posix)
        
        print(f"Final Decision: {closest_user} (Score: {score})") 

        if closest_user and score > THRESHOLD:
            print(closest_user)
            return jsonify({'username': closest_user}), 200
        # return jsonify({'error': 'Voice not recognized. Please try again or sign up!'}), 401
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == '__main__':
    app.run(debug=True)