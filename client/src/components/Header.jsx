import React from 'react';
import './Header.css'; // (기존 네 CSS 파일 경로 맞게 써라)

const Header = ({ onGoHome, onGoCreator }) => {
    return (
        <header className="app-header">
            <div className="nav-buttons">
                <button className="home-btn" onClick={onGoHome}>🏠 메인으로</button>
                {/* 💡 신의 영역 입장 버튼 추가 */}
                <button className="creator-btn" onClick={onGoCreator}>🛠️ 제작자 스튜디오</button>
            </div>

            <div className="header-title">JEMS ROLEPLAY</div>

            <div className="header-right">
                {/* 우측 여백 밸런스용 */}
            </div>
        </header>
    );
};

export default Header;