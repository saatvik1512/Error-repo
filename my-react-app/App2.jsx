import { useState } from 'react'
import App from './App'
import VoiceAuth from './components/VoiceAuth'
import './App.css'

function App2() {
    const [currentUser, setCurrentUser] = useState(() => {
      // Optional: Add localStorage persistence
      return localStorage.getItem('voiceAuthUser') || null;
    });
  
    const handleAuthSuccess = (userId) => {
      localStorage.setItem('voiceAuthUser', userId); // Optional persistence
      setCurrentUser(userId);
    };
  
    const handleLogout = () => {
      localStorage.removeItem('voiceAuthUser');
      setCurrentUser(null);
    };
  
    return (
      <div className="App">
        {!currentUser ? (
          <VoiceAuth onAuthSuccess={handleAuthSuccess} />
        ) : (
          <div>
            <div className="user-header">
              <span>Hello User ({currentUser.slice(0, 8)})</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
            <App/>
          </div>
        )}
      </div>
    );
  }
export default App2