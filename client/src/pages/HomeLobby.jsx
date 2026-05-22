import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreatorStudio.css'; // 기존 스타일 재활용

const HomeLobby = ({ onStartChat, onEditCharacter }) => {
    const [characterList, setCharacterList] = useState([]);
    const [personasList, setPersonasList] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [loading, setLoading] = useState(true);

    const [showPrologueModal, setShowPrologueModal] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState(null);

    useEffect(() => {
        const fallbackData = async () => {
            try {
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

    const openPrologueSelector = async (charId) => {
        if (!selectedPersonaId) {
            alert('야, 오른쪽 톱니바퀴나 로비에서 내 프로필(페르소나)부터 하나 생성해라!');
            return;
        }

        try {
            const res = await axios.get(`http://localhost:5000/api/character/${charId}`);

            if (res.data.success) {
                const fullChar = res.data.character;
                if (!fullChar.prologues || fullChar.prologues.length <= 1) {
                    executeCreateRoom(fullChar._id, 0);
                } else {
                    setSelectedCharacter(fullChar);
                    setShowPrologueModal(true);
                }
            }
        } catch (error) {
            console.error('캐릭터 풀 데이터 불러오기 좆됨:', error);
            alert('캐릭터 정보 불러오다 서버 터짐 ㅆㅂ');
        }
    };

    const executeCreateRoom = async (characterId, prologueIdx) => {
        try {
            const res = await axios.post('http://localhost:5000/api/session/start', {
                characterId,
                personaId: selectedPersonaId,
                prologueIndex: prologueIdx
            });

            if (res.data.success) {
                setShowPrologueModal(false);
                alert('과몰입 방 생성 완! 대화방으로 강제 워프한다.');
                onStartChat(res.data.sessionId);
            }
        } catch (error) {
            alert('방 파다가 서버 터짐 ㅆㅂ');
        }
    };

    // 🚨 [신규] 캐릭터 카드 영구 삭제 로직!
    const handleDeleteCharacter = async (charId, charTitle) => {
        if (!window.confirm(`진짜 [${charTitle}] 캐릭터를 영구 삭제할 거냐? 엮여있는 채팅방 에러날 수도 있다 파트너.`)) {
            return;
        }

        try {
            const res = await axios.delete(`http://localhost:5000/api/character/${charId}`);
            if (res.data.success) {
                alert('캐릭터 영구 삭제 컷!');
                // 프론트엔드 목록에서 방금 지운 놈만 쏙 빼고 다시 그리기 (새로고침 방지)
                setCharacterList(prev => prev.filter(c => c._id !== charId));
            }
        } catch (error) {
            console.error('❌ 캐릭터 삭제 좆됨:', error);
            alert('삭제하다 서버 터짐 ㅆㅂ');
        }
    };

    if (loading) return <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>로비 입장 중...</div>;

    return (
        <div style={{ padding: '30px', color: 'white', width: '100%', height: 'calc(100vh - 60px)', overflowY: 'auto', position: 'relative' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #3f3f4e', paddingBottom: '15px', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#ffe600', letterSpacing: '1px' }}>CHARACTER LOBBY</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#aaa', fontSize: '0.85rem' }}>마음에 드는 세계관을 고르고 과몰입을 시작해라 파트너.</p>
                </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {characterList.map((char) => (
                    <div key={char._id} style={{ backgroundColor: '#2b2b36', border: '1px solid #3f3f4e', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' }}>
                        <div style={{ width: '100%', height: '180px', background: char.thumbnailUrl ? `#1a1a1f url(${char.thumbnailUrl}) center/cover no-repeat` : '#1a1a1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!char.thumbnailUrl && <span style={{ color: '#3f3f4e', fontWeight: 'bold', fontSize: '1.2rem' }}>NO IMAGE</span>}
                        </div>

                        <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{char.title}</h3>
                            <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem', lineHeight: '1.4', flex: 1 }}>{char.summary || '등록된 한 줄 소개가 없습니다.'}</p>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    onClick={() => openPrologueSelector(char._id)}
                                    style={{ flex: 1, backgroundColor: '#ffe600', color: '#000', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ⚔️ 대화 시작
                                </button>

                                {/* 🚨 버튼 그룹: 수정(⚙️) + 삭제(🗑️) */}
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button
                                        onClick={() => onEditCharacter(char._id)}
                                        title="캐릭터 수정"
                                        style={{ backgroundColor: '#3f3f4e', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        ⚙️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCharacter(char._id, char.title)}
                                        title="캐릭터 삭제"
                                        style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showPrologueModal && selectedCharacter && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: '#2b2b36', border: '1px solid #ffe600', borderRadius: '12px',
                        padding: '25px', width: '80%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #3f3f4e', paddingBottom: '15px', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, color: '#ffe600' }}>📖 도입부(프롤로그) 선택</h2>
                            <button onClick={() => setShowPrologueModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>❌</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {selectedCharacter.prologues.map((p, index) => (
                                <div key={index} style={{
                                    background: '#1e1e24', border: '1px solid #3f3f4e', padding: '15px', borderRadius: '8px',
                                    display: 'flex', flexDirection: 'column', gap: '10px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>루트 #{index + 1}: {p.title || `프롤로그 ${index + 1}`}</h3>
                                        <button
                                            onClick={() => executeCreateRoom(selectedCharacter._id, index)}
                                            style={{ background: '#ffe600', color: '#000', border: 'none', padding: '6px 15px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            👉 이 루트로 시작
                                        </button>
                                    </div>
                                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem' }}>
                                        <strong style={{ color: '#ffe600' }}>[플레이 가이드]</strong> {p.guide || '가이드 없음'}
                                    </p>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', fontSize: '0.8rem', color: '#ccc', maxHeight: '100px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                                        {p.description || '내용 없음'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeLobby;