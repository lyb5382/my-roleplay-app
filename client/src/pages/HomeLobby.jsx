import React from 'react';

const HomeLobby = ({ onStartChat }) => {
    return (
        <div style={{ padding: '40px', color: 'white', textAlign: 'center', width: '100%' }}>
            <h1 style={{ color: '#ffe600' }}>WELCOME TO JEMS ROLEPLAY</h1>
            <p style={{ color: '#aaa' }}>여기에 나중에 캐릭터 썸네일이랑 리스트 쫙 깔릴 예정임.</p>

            {/* 나중에 캐릭터 카드 클릭하면 API 쏴서 방 만들고 onStartChat(방ID) 실행하게 될 거임 */}
            <div style={{ marginTop: '50px', padding: '20px', border: '1px solid #3f3f4e', borderRadius: '8px', display: 'inline-block' }}>
                <h3>[임시] 캐릭터 로스터 구역</h3>
                <p>DB 연결해서 리스트 띄우는 건 다음 스텝에서 깎자고.</p>
            </div>
        </div>
    );
};

export default HomeLobby;