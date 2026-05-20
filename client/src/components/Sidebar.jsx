import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Sidebar.css';

const Sidebar = ({ onSelectSession, activeSessionId }) => {
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
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
        fetchSessions();
    }, []);

    return (
        <div className="sidebar">
            <div className="sidebar-header">채팅방 목록</div>
            <div className="session-list">
                {sessions.map((session) => (
                    <div
                        key={session._id}
                        className={`session-item ${activeSessionId === session._id ? 'active' : ''}`}
                        onClick={() => onSelectSession(session._id)}
                    >
                        <div className="session-title">
                            {session.characterId ? session.characterId.title : '삭제된 캐릭터'}
                        </div>
                        <div className="session-info">
                            내 캐릭터: {session.personaId ? session.personaId.name : '알 수 없음'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;