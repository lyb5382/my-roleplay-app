import React from 'react';
import './Header.css'; // (기존 네 CSS 파일 경로 맞게 써라)

const Header = ({ onGoHome, onGoCreator, theme, toggleTheme }) => {
    return (
        <header className="app-header">
            <div className="nav-buttons">
                <button className="home-btn" onClick={onGoHome}>🏠 메인으로</button>
                {/* 💡 신의 영역 입장 버튼 추가 */}
                <button className="creator-btn" onClick={onGoCreator}>🛠️ 제작자 스튜디오</button>
            </div>

            <div className="header-title">JEMS ROLEPLAY</div>
            <div className="header-right" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        background: theme === 'light' ? '#e0e0e0' : 'transparent',
                        border: '1px solid #3f3f4e',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        color: theme === 'light' ? '#000' : '#fff',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    {theme === 'light' ? '🌙 다크 모드' : '🌞 라이트 모드'}
                </button>
            </div>
        </header>
    );
};

export default Header;