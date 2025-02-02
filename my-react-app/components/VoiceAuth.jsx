import React, { useState, useRef, useEffect } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import axios from 'axios';
import './VoiceAuth.css';

const VoiceAuth = ({ onAuthSuccess }) => {
  const [authStatus, setAuthStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaBlobRef = useRef(null);
  const timeoutRef = useRef(null);

  const { status, startRecording, stopRecording } = useReactMediaRecorder({
    audio: true,
    blobPropertyBag: { type: 'audio/wav' },
    onStop: (blobUrl, blob) => {
      mediaBlobRef.current = blob;
    }
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAuth = async (isSignUp) => {
    setAuthStatus('');
    
    if (!mediaBlobRef.current) {
      // Start recording and update status accordingly
      startRecording();
      setAuthStatus(isSignUp 
        ? 'Speak your registration phrase now...' 
        : 'Speak your login phrase now...');
      
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 5000);
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', mediaBlobRef.current, 'recording.wav');

      // Decide which endpoint to call: /signup or /signin
      const endpoint = isSignUp ? '/signup' : '/signin';
      console.log(`http://localhost:5000${endpoint}`)
      const response = await axios.post(`http://localhost:5000${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAuthStatus('Voice verified! Redirecting...');

      // Delay redirect to show the message, then call onAuthSuccess
      setTimeout(() => {
        onAuthSuccess(response.data.userId || response.data.username);
      }, 1500);
    } catch (error) {
      const message = error.response?.data?.error || 
        (error.message.includes('401') 
          ? 'Voice mismatch. Try speaking closer to the mic!' 
          : 'Authentication failed');
      setAuthStatus(message);
    } finally {
      setIsProcessing(false);
      mediaBlobRef.current = null;
    }
  };

  return (
    <div className="auth-container">
      <h2>Height Detection App</h2>
      <p>Authenticate with your voice</p>
      
      <div className="button-group">
        <button 
          onClick={() => handleAuth(true)}
          disabled={status === 'recording' || isProcessing}
        >
          {status === 'recording' ? 'Recording...' : 'Sign Up'}
        </button>
        
        <button 
          onClick={() => handleAuth(false)}
          disabled={status === 'recording' || isProcessing}
        >
          {status === 'recording' ? 'Recording...' : 'Sign In'}
        </button>
      </div>

      {authStatus && (
        <div className={`auth-status ${authStatus.includes('Redirecting') ? 'success' : 'error'}`}>
          {authStatus}
        </div>
      )}
    </div>
  );
};

export default VoiceAuth;
