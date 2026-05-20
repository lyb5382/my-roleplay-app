import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './ChatRoom.css';

const ChatRoom = ({ sessionId }) => {
    // 1️⃣ 모든 훅(Hooks)은 무조건 최상단에 배치! 절대 딴 거 먼저 오면 안 됨.
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [temperature, setTemperature] = useState(0.8);
    const [maxTokens, setMaxTokens] = useState(1000);
    const [personasList, setPersonasList] = useState([]);
    const [currentPersonaId, setCurrentPersonaId] = useState('');
    const [isEditingPersona, setIsEditingPersona] = useState(false);
    const [personaEditName, setPersonaEditName] = useState('');
    const [personaEditDesc, setPersonaEditDesc] = useState('');
    const [isCreatingPersona, setIsCreatingPersona] = useState(false);
    const [newPersonaName, setNewPersonaName] = useState('');
    const [newPersonaDesc, setNewPersonaDesc] = useState('');
    const [summaryInterval, setSummaryInterval] = useState(10);
    const [summaryPrompt, setSummaryPrompt] = useState('이전 대화의 핵심 내용과 현재 상황을 3문장 이내로 요약해라.');
    const [memorySummary, setMemorySummary] = useState('');
    const [visualAssets, setVisualAssets] = useState([]);
    const [activeVisualUrl, setActiveVisualUrl] = useState('');
    const messagesEndRef = useRef(null);

    // 2️⃣ useEffect들도 전부 훅이니까 여기서 다 선언!
    useEffect(() => {
        if (!sessionId) return;
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/session/${sessionId}`);
                if (res.data.success) {
                    setMessages(res.data.messages);
                    setCurrentPersonaId(res.data.session?.personaId?._id || res.data.session?.personaId);
                    setVisualAssets(res.data.character?.visualAssets || []); // 🚨 에셋 목록 땡겨오기

                    if (res.data.session) {
                        setSummaryInterval(res.data.session.summaryInterval || 10);
                        setSummaryPrompt(res.data.session.summaryPrompt || '');
                        setMemorySummary(res.data.session.memorySummary || '');
                    }
                }
            } catch (error) { console.error('❌ 이전 기록 좆됨:', error); }
        };
        fetchHistory();
    }, [sessionId]);

    useEffect(() => {
        if (messages.length === 0) return;
        // 가장 최근 메시지부터 역순으로 뒤져서 이미지 힌트 찾기
        const latestImgMsg = [...messages].reverse().find(m => m.content.match(/\|\|asset_(tag|url):.*?\|\|/));

        if (latestImgMsg) {
            const tagMatch = latestImgMsg.content.match(/\|\|asset_tag:(.*?)\|\|/);
            const urlMatch = latestImgMsg.content.match(/\|\|asset_url:(.*?)\|\|/);

            if (urlMatch) {
                setActiveVisualUrl(urlMatch[1].trim()); // 제작자가 프롤로그에 직접 박은 하드코딩 링크
            } else if (tagMatch) {
                const asset = visualAssets.find(a => a.tag === tagMatch[1].trim());
                if (asset) setActiveVisualUrl(asset.url); // AI가 고른 다이내믹 상황별 태그
            }
        } else {
            // 태그가 아무것도 없으면 메인 대표 이미지(default) 띄움
            const defaultAsset = visualAssets.find(a => a.tag === 'default');
            if (defaultAsset) setActiveVisualUrl(defaultAsset.url);
        }
    }, [messages, visualAssets]);

    // 페르소나 목록 서버에서 긁어오는 함수 (독립 선언)
    const loadPersonas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/persona/list');
            if (res.data.success) setPersonasList(res.data.list);
        } catch (error) { console.error('❌ 페르소나 목록 로드 실패:', error); }
    };

    useEffect(() => {
        if (showSettings && personasList.length === 0) {
            loadPersonas();
        }
    }, [showSettings]);

    useEffect(() => {
        if (editingIndex === null) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, editingIndex]);

    // 3️⃣ 일반 함수들 선언
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post(`http://localhost:5000/api/session/${sessionId}/chat`, {
                message: userMsg.content,
                temperature: Number(temperature),
                maxTokens: Number(maxTokens)
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (error) {
            console.error('❌ 전송 좆됨:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReroll = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await axios.post(`http://localhost:5000/api/session/${sessionId}/reroll`, {
                temperature: Number(temperature),
                maxTokens: Number(maxTokens)
            });
            if (res.data.success) setMessages(res.data.messages);
        } catch (error) { alert('리롤 실패 ㅆㅂ'); } finally { setIsLoading(false); }
    };

    const handleDelete = async (index) => {
        if (!window.confirm('진짜 이 대화 찢어버림?')) return;
        try {
            const res = await axios.delete(`http://localhost:5000/api/session/${sessionId}/message/${index}`);
            if (res.data.success) setMessages(res.data.messages);
        } catch (error) { alert('삭제 실패 ㅆㅂ'); }
    };

    const handleEditStart = (index, content) => { setEditingIndex(index); setEditContent(content); };
    const handleEditCancel = () => { setEditingIndex(null); setEditContent(''); };
    const handleEditSave = async (index) => {
        if (!editContent.trim()) return;
        try {
            const res = await axios.put(`http://localhost:5000/api/session/${sessionId}/message/${index}`, { newContent: editContent });
            if (res.data.success) { setMessages(res.data.messages); setEditingIndex(null); }
        } catch (error) { alert('수정 실패 ㅆㅂ'); }
    };

    const handleSwipe = async (index, direction) => {
        const msg = messages[index];
        if (!msg.swipes || msg.swipes.length <= 1) return;
        const currentIndex = msg.swipes.indexOf(msg.content);
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = msg.swipes.length - 1;
        if (nextIndex >= msg.swipes.length) nextIndex = 0;
        try {
            const res = await axios.put(`http://localhost:5000/api/session/${sessionId}/message/${index}`, { newContent: msg.swipes[nextIndex] });
            if (res.data.success) setMessages(res.data.messages);
        } catch (error) { console.error('스와이프 좆됨', error); }
    };

    const handlePersonaChange = async (e) => {
        const newPersonaId = e.target.value;
        setCurrentPersonaId(newPersonaId);
        try {
            await axios.put(`http://localhost:5000/api/session/${sessionId}/persona`, { personaId: newPersonaId });
            alert('캐릭터 갈아끼우기 완료! 다음 턴부터 이 캐릭터로 롤플함.');
        } catch (error) { console.error('❌ 페르소나 변경 좆됨:', error); }
    };

    // ➕ 새 페르소나 생성해서 서버로 쏘기
    const handlePersonaCreate = async () => {
        if (!newPersonaName.trim() || !newPersonaDesc.trim()) {
            alert('이름이랑 설정 다 적어라 멍청아');
            return;
        }
        try {
            const res = await axios.post('http://localhost:5000/api/persona/create', {
                name: newPersonaName,
                description: newPersonaDesc
            });
            if (res.data.success) {
                alert(`새 프로필 [${newPersonaName}] 런칭 완료!`);
                setNewPersonaName('');
                setNewPersonaDesc('');
                setIsCreatingPersona(false);
                await loadPersonas(); // 리스트 갱신해서 콤보박스에 바로 뜨게 만들기!
            }
        } catch (error) {
            console.error(error);
            alert('프로필 만드는데 서버 터짐 ㅆㅂ');
        }
    };

    // 🛠️ 페르소나 수정 저장 버튼 눌렀을 때
    const handlePersonaUpdate = async () => {
        if (!personaEditName.trim() || !personaEditDesc.trim()) return;
        try {
            const res = await axios.put(`http://localhost:5000/api/persona/${currentPersonaId}`, {
                name: personaEditName,
                description: personaEditDesc
            });
            if (res.data.success) {
                alert('내 프로필 수정 완!');
                setIsEditingPersona(false);
                await loadPersonas(); // 목록 새로고침 빡!
            }
        } catch (error) { alert('프로필 수정 실패 ㅆㅂ'); }
    };

    // 🗑️ 페르소나 삭제 버튼 눌렀을 때
    const handlePersonaDelete = async () => {
        if (!window.confirm('진짜 이 프로필 영구 삭제함? 관련 대화방 터질 수도 있음.')) return;
        try {
            const res = await axios.delete(`http://localhost:5000/api/persona/${currentPersonaId}`);
            if (res.data.success) {
                alert('프로필 찢어버림.');
                setCurrentPersonaId('');
                setIsEditingPersona(false);
                await loadPersonas(); // 목록 새로고침 빡!
            }
        } catch (error) { alert('프로필 삭제 실패 ㅆㅂ'); }
    };

    // 🧠 스마트 메모리 설정 DB에 빵 쏘기
    const handleMemorySave = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/session/${sessionId}/memory`, {
                summaryInterval: Number(summaryInterval),
                summaryPrompt,
                memorySummary
            });
            if (res.data.success) alert('기억력 세팅 뇌에 박아넣음 완!');
        } catch (error) {
            alert('메모리 저장 좆됨 ㅆㅂ');
        }
    };

    // 4️⃣ 조건부 렌더링(early return)은 반드시 모든 훅 선언이 다 끝난 여기서 해야 함!!
    if (!sessionId) {
        return <div className="chat-container"><div className="chat-header">왼쪽에서 채팅방 골라라 파트너</div></div>;
    }

    // 5️⃣ 진짜 화면 렌더링
    return (
        <div className="chat-container">
            <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', flexShrink: 0 }}>
                <span>과몰입 롤플레잉 방</span>
                <button className="header-menu-btn" onClick={() => setShowSettings(!showSettings)}>
                    {showSettings ? '❌' : '⚙️'}
                </button>
            </div>

            <div className="chat-body-wrapper">
                <div className="chat-main-col">

                    {activeVisualUrl && (
                        <div style={{ width: '100%', height: '220px', background: `#111 url(${activeVisualUrl}) center/cover no-repeat`, borderBottom: '1px solid #3f3f4e', flexShrink: 0 }} />
                    )}
                    <div className="chat-messages">
                        {messages.map((msg, index) => {
                            // 💡 화면에 말풍선 띄울 땐 흉측한 시스템 태그 텍스트 다 날려버림!
                            const displayContent = msg.content.replace(/\|\|asset_(tag|url):.*?\|\|/g, '').trim();

                            return (
                                <div key={index} className={`bubble-wrapper ${msg.role}`}>
                                    {/* ... 기존 msg.actions 버튼들 ... */}

                                    {editingIndex === index ? (
                                        <div className={`bubble ${msg.role}`} style={{ width: '100%' }}>
                                            {/* 수정 창에서는 쌩 텍스트(editContent) 그대로 보임 */}
                                            <textarea className="edit-textarea" rows="4" value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                                            <div className="edit-actions">
                                                <button className="save-btn" onClick={() => handleEditSave(index)}>저장</button>
                                                <button className="cancel-btn" onClick={handleEditCancel}>취소</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`bubble ${msg.role}`}>
                                            {/* 🚨 쌩 텍스트 날려버리고 마크다운 렌더러로 덮어쓰기! */}
                                            <ReactMarkdown>{displayContent}</ReactMarkdown>

                                            {msg.swipes && msg.swipes.length > 1 && (
                                                <div className="swipe-controls">
                                                    <button className="swipe-btn" onClick={() => handleSwipe(index, -1)}>◀</button>
                                                    {msg.swipes.indexOf(msg.content) + 1} / {msg.swipes.length}
                                                    <button className="swipe-btn" onClick={() => handleSwipe(index, 1)}>▶</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {isLoading && <div className="bubble-wrapper assistant"><div className="bubble assistant">뇌 굴리는 중...</div></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="야, 할 말 쳐봐..." disabled={isLoading} />
                        <button onClick={sendMessage} disabled={isLoading}>전송</button>
                    </div>
                </div>

                {showSettings && (
                    <div className="chat-settings-sidebar">
                        <div className="setting-section">
                            <label>🎭 내 페르소나 관리</label>
                            <div className="persona-control-group">
                                <select
                                    className="persona-select"
                                    value={currentPersonaId}
                                    onChange={(e) => {
                                        handlePersonaChange(e);
                                        setIsEditingPersona(false); // 캐릭 바꾸면 수정창 닫기
                                        setIsCreatingPersona(false); // 생성 창 열려있으면 닫기
                                    }}
                                >
                                    <option value="">캐릭터 선택</option>
                                    {personasList.map(p => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>

                                {/* 💡 생성 및 수정/삭제 버튼 구역이 여길 통째로 빠져있었음! */}
                                <div className="persona-btn-row">
                                    <button className="persona-mini-btn edit" style={{ backgroundColor: '#ffe600', color: '#000' }} onClick={() => {
                                        setIsCreatingPersona(!isCreatingPersona);
                                        setIsEditingPersona(false);
                                    }}>
                                        {isCreatingPersona ? '취소' : '➕ 새 프로필'}
                                    </button>

                                    {currentPersonaId && !isCreatingPersona && (
                                        <>
                                            <button className="persona-mini-btn edit" onClick={() => {
                                                const active = personasList.find(p => p._id === currentPersonaId);
                                                setPersonaEditName(active?.name || '');
                                                setPersonaEditDesc(active?.description || '');
                                                setIsEditingPersona(!isEditingPersona);
                                            }}>
                                                {isEditingPersona ? '취소' : '✏️ 수정'}
                                            </button>
                                            <button className="persona-mini-btn delete" onClick={handlePersonaDelete}>🗑️ 삭제</button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* 🧠 스마트 메모리 컨트롤 구역 */}
                            <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                                <label>🧠 스마트 메모리 (오토 요약)</label>

                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '0.8rem' }}>
                                    <span>요약 주기 (턴)</span>
                                    <input
                                        type="number"
                                        min="0" max="50"
                                        value={summaryInterval}
                                        onChange={(e) => setSummaryInterval(e.target.value)}
                                        style={{ width: '50px', backgroundColor: '#1e1e24', color: 'white', border: '1px solid #3f3f4e' }}
                                    />
                                </div>

                                <textarea
                                    rows="2"
                                    value={summaryPrompt}
                                    onChange={(e) => setSummaryPrompt(e.target.value)}
                                    placeholder="어떻게 요약할지 지시어 입력 (예: 감정선 위주로 요약해라)"
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#1e1e24', color: 'white', border: '1px solid #3f3f4e', fontSize: '0.8rem', outline: 'none' }}
                                />

                                <label style={{ marginTop: '10px', color: '#888' }}>현재 뇌에 박힌 요약본 (직접 수정 가능)</label>
                                <textarea
                                    rows="4"
                                    value={memorySummary}
                                    onChange={(e) => setMemorySummary(e.target.value)}
                                    placeholder="현재 저장된 요약 내용이 없습니다."
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#rgba(0,0,0,0.2)', color: '#ffe600', border: '1px solid #3f3f4e', fontSize: '0.8rem', outline: 'none' }}
                                />

                                <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem', width: '100%' }} onClick={handleMemorySave}>
                                    메모리 업데이트 빡!
                                </button>
                            </div>
                            {/* 💡 신규 생성 모드 폼 */}
                            {isCreatingPersona && (
                                <div className="persona-edit-form" style={{ border: '1px solid #ffe600' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#ffe600', fontWeight: 'bold' }}>✨ 신규 페르소나 등록</span>
                                    <input
                                        type="text"
                                        value={newPersonaName}
                                        onChange={(e) => setNewPersonaName(e.target.value)}
                                        placeholder="프로필 이름 (예: 천재 해커 파트너)"
                                    />
                                    <textarea
                                        rows="3"
                                        value={newPersonaDesc}
                                        onChange={(e) => setNewPersonaDesc(e.target.value)}
                                        placeholder="나이, 성격, 외모 설정을 디테일하게 치셈..."
                                    />
                                    <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem' }} onClick={handlePersonaCreate}>
                                        프로필 생성 빡!
                                    </button>
                                </div>
                            )}

                            {/* 수정 모드 활성화 시 열리는 인라인 폼 */}
                            {isEditingPersona && (
                                <div className="persona-edit-form">
                                    <input type="text" value={personaEditName} onChange={(e) => setPersonaEditName(e.target.value)} placeholder="프로필 이름" />
                                    <textarea rows="3" value={personaEditDesc} onChange={(e) => setPersonaEditDesc(e.target.value)} placeholder="상세 설정 기입..." />
                                    <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem' }} onClick={handlePersonaUpdate}>
                                        프로필 변경사항 저장
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="setting-section">
                            <label>🔥 똘끼 (Temperature)</label>
                            <input
                                type="range" min="0" max="0.8" step="0.1"
                                value={temperature} onChange={(e) => setTemperature(e.target.value)} disabled={isLoading}
                            />
                            <div className="setting-value">{temperature}</div>
                        </div>

                        <div className="setting-section">
                            <label>📝 최대 길이 (Max Tokens)</label>
                            <input
                                type="range" min="100" max="5000" step="100"
                                value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} disabled={isLoading}
                            />
                            <div className="setting-value">{maxTokens}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;    