import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatRoom from './pages/ChatRoom';
import CreatorStudio from './pages/CreatorStudio';
import HomeLobby from './pages/HomeLobby'; // 💡 새로 만들 로비 화면
import './App.css';

function App() {
  // 화면 모드 제어: 'home' (메인) | 'chat' (채팅방) | 'creator' (제작자)
  const [currentView, setCurrentView] = useState('home');

  const [currentSessionId, setCurrentSessionId] = useState(() => {
    const saved = localStorage.getItem('activeSessionId');
    // 저장된 방이 있으면 시작부터 채팅방 띄워줌
    if (saved) setCurrentView('chat');
    return saved || null;
  });

  // 💬 사이드바에서 과거 채팅방 클릭했을 때
  const handleSelectSession = (id) => {
    setCurrentSessionId(id);
    localStorage.setItem('activeSessionId', id);
    setCurrentView('chat'); // 채팅방 화면으로 전환
  };

  // 🏠 헤더에서 '메인으로' 버튼 눌렀을 때
  const handleGoHome = () => {
    setCurrentView('home'); // 홈 화면으로 전환
    setCurrentSessionId(null);
    localStorage.removeItem('activeSessionId');
  };

  // 🛠️ 헤더에서 '제작자 모드' 버튼 눌렀을 때
  const handleGoCreator = () => {
    setCurrentView('creator'); // 스튜디오로 전환
    setCurrentSessionId(null); // 방 선택 해제
    localStorage.removeItem('activeSessionId');
  };

  // 💡 메인 화면(홈)에서 특정 캐릭터 카드 누르고 '새 채팅 시작' 했을 때
  const handleStartNewChat = (newSessionId) => {
    setCurrentSessionId(newSessionId);
    localStorage.setItem('activeSessionId', newSessionId);
    setCurrentView('chat');
  };

  return (
    <div className="app-layout">
      {/* 1. 맨 위 헤더 (제작자 모드 진입 함수도 넘겨줌) */}
      <Header onGoHome={handleGoHome} onGoCreator={handleGoCreator} />

      {/* 2. 아래쪽 본문 (사이드바 + 메인 컨텐츠) */}
      <div className="main-body">
        {/* 사이드바는 항상 떠있음 */}
        <Sidebar
          onSelectSession={handleSelectSession}
          activeSessionId={currentSessionId}
        />

        {/* 화면 상태(currentView)에 따라 컴포넌트 갈아끼우기 */}
        <div className="main-content">
          {currentView === 'home' && <HomeLobby onStartChat={handleStartNewChat} />}
          {currentView === 'chat' && <ChatRoom sessionId={currentSessionId} />}
          {currentView === 'creator' && <CreatorStudio />}
        </div>
      </div>
    </div>
  );
}

export default App;