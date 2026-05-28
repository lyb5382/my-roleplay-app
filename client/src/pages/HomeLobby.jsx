import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './CreatorStudio.css'

const HomeLobby = ({ onStartChat, onEditCharacter }) => {
    const [characterList, setCharacterList] = useState([]);
    const [personasList, setPersonasList] = useState([]);
    const [selectedPersonaId, setSelectedPersonaId] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDetailModal, setShowDetailModal] = useState(false);
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

    const openCharacterDetail = async (charId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/character/${charId}`);
            if (res.data.success) {
                setSelectedCharacter(res.data.character);
                setShowDetailModal(true); // 상세창부터 오픈!
            }
        } catch (error) {
            alert('상세 정보 불러오다 서버 터짐 ㅆㅂ');
        }
    };

    // 🚨 잼스 수술: 상세 모달에서 '대화 시작' 누르면 프롤로그 창으로 넘기는 함수
    const handleStartFromDetail = () => {
        if (!selectedPersonaId) {
            alert('야, 오른쪽 톱니바퀴나 로비에서 내 프로필(페르소나)부터 하나 생성해라!');
            return;
        }
        setShowDetailModal(false); // 상세창 닫고

        // 프롤로그가 없거나 1개면 바로 방 파고, 아니면 프롤로그 선택창 띄움
        if (!selectedCharacter.prologues || selectedCharacter.prologues.length <= 1) {
            executeCreateRoom(selectedCharacter._id, 0);
        } else {
            setShowPrologueModal(true);
        }
    };

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
        <div style={{ padding: '30px', color: 'white', width: '100%', overflowY: 'auto', position: 'relative' }}>

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
                    <div key={char._id} style={{ backgroundColor: '#2b2b36', border: '1px solid #3f3f4e', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', cursor: 'pointer' }}>

                        {/* 🚨 잼스 수술: 이 구역(이미지+텍스트)을 누르면 '상세 정보 팝업'이 뜸! */}
                        <div onClick={() => openCharacterDetail(char._id)} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ width: '100%', height: '180px', background: char.thumbnailUrl ? `#1a1a1f url(${char.thumbnailUrl}) center/cover no-repeat` : '#1a1a1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {!char.thumbnailUrl && <span style={{ color: '#3f3f4e', fontWeight: 'bold', fontSize: '1.2rem' }}>NO IMAGE</span>}
                            </div>

                            <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{char.title}</h3>
                                <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem', lineHeight: '1.4', flex: 1 }}>{char.summary || '등록된 한 줄 소개가 없습니다.'}</p>
                            </div>
                        </div>

                        {/* 🚨 잼스 수술: 버튼 누를 때는 팝업 안 뜨게 e.stopPropagation() 장착! */}
                        <div style={{ padding: '0 15px 15px 15px', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); openPrologueSelector(char._id); }}
                                style={{ flex: 1, backgroundColor: '#ffe600', color: '#000', border: 'none', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                ⚔️ 대화 시작
                            </button>

                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditCharacter(char._id); }}
                                    title="캐릭터 수정"
                                    style={{ backgroundColor: '#3f3f4e', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    ⚙️
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(char._id, char.title); }}
                                    title="캐릭터 삭제"
                                    style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showDetailModal && selectedCharacter && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="detail-modal-box" style={{ background: '#2b2b36', border: '1px solid #3f3f4e', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        {/* 썸네일 & 닫기 버튼 겹쳐서 헤더처럼 쓰기 */}
                        <div style={{ position: 'relative', width: '100%', height: '250px', background: selectedCharacter.thumbnailUrl ? `#111 url(${selectedCharacter.thumbnailUrl}) center/cover no-repeat` : '#1a1a1f' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '50%', width: '35px', height: '35px' }}>❌</button>
                            {!selectedCharacter.thumbnailUrl && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3f3f4e', fontSize: '2rem', fontWeight: 'bold' }}>NO IMAGE</div>}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '40px 20px 15px', background: 'linear-gradient(to top, rgba(43,43,54,1) 10%, transparent)' }}>
                                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.8rem', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', wordBreak: 'keep-all', overflowWrap: 'break-word', lineHeight: '1.3' }}>
                                    {selectedCharacter.title}
                                </h2>
                            </div>
                        </div>

                        {/* 본문 스크롤 영역 */}
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ fontSize: '1rem', color: '#ffe600', fontWeight: 'bold', borderBottom: '1px solid #3f3f4e', paddingBottom: '10px' }}>
                                {selectedCharacter.summary || '한 줄 요약이 없습니다.'}
                            </div>

                            {/* 🚨 마크다운으로 렌더링된 상세 설정 */}
                            <div className="markdown-body" style={{ color: '#ccc', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                {selectedCharacter.description ? (
                                    <ReactMarkdown>{selectedCharacter.description}</ReactMarkdown>
                                ) : (
                                    <p style={{ fontStyle: 'italic', color: '#888' }}>상세 설명이 등록되지 않았습니다.</p>
                                )}
                            </div>
                        </div>

                        {/* 하단 고정 액션 바 */}
                        <div style={{ padding: '15px 20px', background: '#1e1e24', borderTop: '1px solid #3f3f4e', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowDetailModal(false)} style={{ padding: '10px 20px', background: 'transparent', color: '#aaa', border: '1px solid #3f3f4e', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>닫기</button>
                            <button onClick={handleStartFromDetail} style={{ padding: '10px 30px', background: '#ffe600', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>⚔️ 대화 시작</button>
                        </div>

                    </div>
                </div>
            )}

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
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px', fontSize: '0.8rem', color: '#ccc', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
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