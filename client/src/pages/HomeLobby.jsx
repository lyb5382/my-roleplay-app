import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreatorStudio.css'; // 기존 스타일 재활용

const HomeLobby = ({ onStartChat, onEditCharacter }) => {
    const [characterList, setCharacterList] = useState([]);
    const [personasList, setPersonasList] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fallbackData = async () => {
            try {
                // 1. 캐릭터 리스트랑 2. 내 페르소나 리스트 동시에 세팅
                const [charRes, personaRes] = await axios.all([
                    axios.get('http://localhost:5000/api/character/list'),
                    axios.get('http://localhost:5000/api/persona/list')
                ]);

                if (charRes.data.success) setCharacterList(charRes.data.list);
                if (personaRes.data.success) {
                    setPersonasList(personaRes.data.list);
                    if (personaRes.data.list.length > 0) setSelectedPersonaId(personaRes.data.list[0]._id);
                }
            } catch (error) {
                console.error('로비 정보 로드 좆됨:', error);
            } finally {
                setLoading(false);
            }
        };
        fallbackData();
    }, []);

    // 🎮 특정 캐릭터 카드의 [새 롤플레잉 시작] 버튼 눌렀을 때
    const handleCreateRoom = async (characterId) => {
        if (!selectedPersonaId) {
            alert('야, 오른쪽 톱니바퀴나 로비에서 내 프로필(페르소나)부터 하나 생성해라!');
            return;
        }

        try {
            // 아까 수정한 백엔드로 쏨 -> 프롤로그 1번이 자동으로 박힌 채팅방이 파짐!
            const res = await axios.post('http://localhost:5000/api/session/start', {
                characterId,
                personaId: selectedPersonaId,
                prologueIndex: 0 // 일단 근본의 0번 프롤로그로 고정 시작
            });

            if (res.data.success) {
                alert('과몰입 방 생성 완! 대화방으로 강제 워프한다.');
                onStartChat(res.data.sessionId); // App.jsx의 조종간을 탭 꺾어서 채팅방 뷰로 이동시킴
            }
        } catch (error) {
            alert('방 파다가 서버 터짐 ㅆㅂ');
        }
    };

    if (loading) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>로비 입장 중...</div>;

    return (
        <div style={{ padding: '30px', color: 'white', width: '100%', height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #3f3f4e', paddingBottom: '15px', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#ffe600', letterSpacing: '1px' }}>CHARACTER LOBBY</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>마음에 드는 세계관을 고르고 과몰입을 시작해라 파트너.</p>
                </div>

                {/* 플레이어 인격 필터 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#2b2b36', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffe600' }}>👤 플레이할 내 인격:</span>
                    <select
                        className="persona-select"
                        style={{ width: '180px', padding: '5px' }}
                        value={selectedPersonaId}
                        onChange={(e) => setSelectedPersonaId(e.target.value)}
                    >
                        {personasList.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                </div>
            </div>

            {/* 🃏 캐릭터 카드 리스트 구역 (그리드 배치) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {characterList.map((char) => (
                    <div key={char._id} style={{ backgroundColor: '#2b2b36', border: '1px solid #3f3f4e', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }}>
                        {/* 카드 상단 이미지 구역 */}
                        <div style={{ width: '100%', height: '180px', background: char.thumbnailUrl ? `#1a1a1f url(${char.thumbnailUrl}) center/cover no-repeat` : '#1a1a1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!char.thumbnailUrl && <span style={{ color: '#3f3f4e', fontWeight: 'bold', fontSize: '1.2rem' }}>NO IMAGE</span>}
                        </div>

                        {/* 카드 상세 글방 */}
                        <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{char.title}</h3>
                            <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem', lineHeight: '1.4', flex: 1 }}>{char.summary || '등록된 한 줄 소개가 없습니다.'}</p>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={() => handleCreateRoom(char._id)}
                                    style={{ flex: 1, backgroundColor: '#ffe600', color: '#000', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ⚔️ 대화 시작
                                </button>
                                <button
                                    onClick={() => onEditCharacter(char._id)}
                                    style={{ backgroundColor: '#3f3f4e', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomeLobby;