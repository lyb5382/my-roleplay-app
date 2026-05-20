import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ onSelectSession, activeSessionId, onSessionDeleted }) => {
    const [sessions, setSessions] = useState([]);

    // 💡 1. 목록 불러오는 함수를 useEffect 밖으로 뺐음! (삭제 후에도 재사용하려고)
    const fetchSessions = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/session/list/all');
            if (res.data.success) {
                setSessions(res.data.list);
            }
        } catch (error) {
            console.error('❌ 사이드바 목록 좆됨:', error);
        }
    };

    useEffect(() => {
        fetchSessions(); // 컴포넌트 켜질 때 1번 실행
    }, []);

    // 🗑️ 채팅방 서버에 삭제 요청 날리기
    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation(); // 🚨 중요: 이거 안 하면 삭제 버튼 누를 때 방 진입 이벤트까지 같이 터짐!

        if (!window.confirm('진짜 이 대화방 영구 폭파함? 복구 안 됨.')) return;

        try {
            const res = await axios.delete(`http://localhost:5000/api/session/${sessionId}`);
            if (res.data.success) {
                alert('방 깔끔하게 날려버림.');

                // 부모 컴포넌트(App.jsx)한테 "이 방 뒤졌음" 알림
                if (onSessionDeleted) onSessionDeleted(sessionId);

                // 💡 2. 삭제 성공하면 아까 빼둔 함수로 목록 싹 다시 긁어옴! (새로고침)
                fetchSessions();
            }
        } catch (error) {
            alert('방 터트리다 서버 터짐 ㅆㅂ');
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">채팅방 목록</div>
            <div className="session-list">
                {sessions.map((session) => (
                    <div
                        key={session._id}
                        className={`session-item ${activeSessionId === session._id ? 'active' : ''}`}
                        onClick={() => onSelectSession(session._id)}
                        // 💡 버튼 우측에 예쁘게 박으려고 relative 줌
                        style={{ position: 'relative', paddingRight: '30px' }}
                    >
                        <div className="session-title">
                            {session.characterId ? session.characterId.title : '삭제된 캐릭터'}
                        </div>
                        <div className="session-info">
                            내 캐릭터: {session.personaId ? session.personaId.name : '알 수 없음'}
                        </div>

                        {/* 💡 3. 여기에 대망의 폭파 스위치 달았다! */}
                        <button
                            onClick={(e) => handleDeleteSession(e, session._id)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: '#888'
                            }}
                            title="방 영구 삭제"
                        >
                            ❌
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;