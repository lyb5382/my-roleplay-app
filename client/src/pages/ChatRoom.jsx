import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './ChatRoom.css';

const ChatRoom = ({ sessionId }) => {
    // 1️⃣ 상태 훅 선언
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
    const [selectedProvider, setSelectedProvider] = useState('QWEN');
    const [summaryPrompt, setSummaryPrompt] = useState('이전 대화의 핵심 내용과 현재 상황을 3문장 이내로 요약해라.');
    const [availableModels, setAvailableModels] = useState({});
    const [memorySummary, setMemorySummary] = useState('');
    const [visualAssets, setVisualAssets] = useState([]);
    const [activeVisualUrl, setActiveVisualUrl] = useState('');
    const [selectedModel, setSelectedModel] = useState('qwen/qwen-2.5-72b-instruct');
    const [userNote, setUserNote] = useState('');
    const [roomGuide, setRoomGuide] = useState('');
    const [isGuideVisible, setIsGuideVisible] = useState(true);
    // 🚨 [신규 1] 최근 턴 몇 개 기억할 건지 조절하는 훅 (기본 15턴 = 메시지 30개)
    const [contextLimit, setContextLimit] = useState(15);
    // 🚨 [신규 2] 실시간 예상 비용 저장하는 훅
    const [currentCost, setCurrentCost] = useState(0);
    const messagesEndRef = useRef(null);

    // 2️⃣ useEffect: 방 기록 불러오기
    useEffect(() => {
        if (!sessionId) return;
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/session/${sessionId}`);
                if (res.data.success) {
                    setMessages(res.data.messages);
                    setCurrentPersonaId(res.data.session?.personaId?._id || res.data.session?.personaId);
                    setVisualAssets(res.data.character?.visualAssets || []);

                    if (res.data.character && res.data.character.prologues && res.data.character.prologues.length > 0) {
                        setRoomGuide(res.data.character.prologues[0].guide || '');
                    }

                    if (res.data.session) {
                        setSummaryInterval(res.data.session.summaryInterval || 10);
                        setSummaryPrompt(res.data.session.summaryPrompt || '');
                        setMemorySummary(res.data.session.memorySummary || '');
                        setUserNote(res.data.session.userNote || '');

                        const savedModel = res.data.session.model || 'qwen/qwen-2.5-72b-instruct';
                        setSelectedModel(savedModel);
                        setSelectedProvider(savedModel.split('/')[0].toUpperCase());
                    }
                }
            } catch (error) { console.error('❌ 이전 기록 좆됨:', error); }
        };
        fetchHistory();
    }, [sessionId]);

    // 💡 이미지 트리거 로직
    useEffect(() => {
        if (messages.length === 0) return;
        const latestImgMsg = [...messages].reverse().find(m => m.content.match(/\|\|asset_(tag|url):.*?\|\|/));
        if (latestImgMsg) {
            const tagMatch = latestImgMsg.content.match(/\|\|asset_tag:(.*?)\|\|/);
            const urlMatch = latestImgMsg.content.match(/\|\|asset_url:(.*?)\|\|/);
            if (urlMatch) {
                setActiveVisualUrl(urlMatch[1].trim());
            } else if (tagMatch) {
                const asset = visualAssets.find(a => a.tag === tagMatch[1].trim());
                if (asset) setActiveVisualUrl(asset.url);
            }
        } else {
            const defaultAsset = visualAssets.find(a => a.tag === 'default');
            if (defaultAsset) setActiveVisualUrl(defaultAsset.url);
        }
    }, [messages, visualAssets]);

    // 💡 모델 목록 불러오기
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await axios.get('https://openrouter.ai/api/v1/models');
                const sortedModels = res.data.data.sort((a, b) => a.name.localeCompare(b.name));
                const allowedProviders = ['GOOGLE', 'ANTHROPIC', 'OPENAI', 'META', 'QWEN', 'MISTRAL', 'COHERE', 'NOUSRESEARCH', 'DEEPSEEK'];
                const grouped = sortedModels.reduce((acc, model) => {
                    const provider = model.id.split('/')[0].toUpperCase();
                    if (allowedProviders.includes(provider)) {
                        if (!acc[provider]) acc[provider] = [];
                        acc[provider].push(model);
                    }
                    return acc;
                }, {});
                setAvailableModels(grouped);
            } catch (error) { console.error('❌ 모델 리스트 털기 좆됨:', error); }
        };
        fetchModels();
    }, []);

    // 🚨 [신규 3] 입력창, 대화기록, 슬라이더 건드릴 때마다 예상 비용 실시간 야매 계산!
    useEffect(() => {
        if (!availableModels[selectedProvider]) return;
        const modelData = availableModels[selectedProvider].find(m => m.id === selectedModel);
        if (!modelData || !modelData.pricing) return;

        const pricePerToken = Number(modelData.pricing.prompt) || 0; // 모델의 입력 1토큰당 가격

        // 유저가 설정한 기억력 한도(contextLimit)만큼만 최근 대화 글자수 합산
        const recentMsgs = messages.slice(-(contextLimit * 2));
        const historyLength = recentMsgs.reduce((acc, m) => acc + (m.content?.length || 0), 0);

        // (과거 대화 길이) + (현재 칠 채팅 길이) + (시스템 프롬프트 넉넉하게 800자 버퍼)
        const totalChars = historyLength + input.length + 800;

        // 💡 야매 공식: 한글은 대충 1글자 = 1.2~1.5 토큰 정도 먹음. (넉넉하게 1.5로 계산)
        const estimatedTokens = totalChars * 1.5;
        setCurrentCost(estimatedTokens * pricePerToken);
    }, [input, messages, contextLimit, selectedModel, selectedProvider, availableModels]);


    const loadPersonas = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/persona/list');
            if (res.data.success) setPersonasList(res.data.list);
        } catch (error) { console.error('❌ 페르소나 목록 로드 실패:', error); }
    };

    useEffect(() => {
        if (showSettings && personasList.length === 0) loadPersonas();
    }, [showSettings]);

    useEffect(() => {
        if (editingIndex === null) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, editingIndex]);

    // 3️⃣ 통신 함수들
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
                maxTokens: Number(maxTokens),
                model: selectedModel,
                contextLimit: Number(contextLimit) // 🚨 백엔드에 기억 한도 통보!
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
        } catch (error) { console.error('❌ 전송 좆됨:', error); }
        finally { setIsLoading(false); }
    };

    const handleReroll = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const res = await axios.post(`http://localhost:5000/api/session/${sessionId}/reroll`, {
                temperature: Number(temperature),
                maxTokens: Number(maxTokens),
                model: selectedModel,
                contextLimit: Number(contextLimit) // 🚨 리롤 칠 때도 한도 통보!
            });
            if (res.data.success) setMessages(res.data.messages);
        } catch (error) { alert('리롤 실패 ㅆㅂ'); }
        finally { setIsLoading(false); }
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

    const handlePersonaCreate = async () => {
        if (!newPersonaName.trim() || !newPersonaDesc.trim()) return alert('이름이랑 설정 다 적어라 멍청아');
        try {
            const res = await axios.post('http://localhost:5000/api/persona/create', { name: newPersonaName, description: newPersonaDesc });
            if (res.data.success) {
                alert(`새 프로필 [${newPersonaName}] 런칭 완료!`);
                setNewPersonaName(''); setNewPersonaDesc(''); setIsCreatingPersona(false);
                await loadPersonas();
            }
        } catch (error) { alert('프로필 만드는데 서버 터짐 ㅆㅂ'); }
    };

    const handlePersonaUpdate = async () => {
        if (!personaEditName.trim() || !personaEditDesc.trim()) return;
        try {
            const res = await axios.put(`http://localhost:5000/api/persona/${currentPersonaId}`, { name: personaEditName, description: personaEditDesc });
            if (res.data.success) {
                alert('내 프로필 수정 완!'); setIsEditingPersona(false); await loadPersonas();
            }
        } catch (error) { alert('프로필 수정 실패 ㅆㅂ'); }
    };

    const handlePersonaDelete = async () => {
        if (!window.confirm('진짜 이 프로필 영구 삭제함? 관련 대화방 터질 수도 있음.')) return;
        try {
            const res = await axios.delete(`http://localhost:5000/api/persona/${currentPersonaId}`);
            if (res.data.success) {
                alert('프로필 찢어버림.'); setCurrentPersonaId(''); setIsEditingPersona(false); await loadPersonas();
            }
        } catch (error) { alert('프로필 삭제 실패 ㅆㅂ'); }
    };

    const handleMemorySave = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/session/${sessionId}/memory`, { summaryInterval: Number(summaryInterval), summaryPrompt, memorySummary });
            if (res.data.success) alert('기억력 세팅 뇌에 박아넣음 완!');
        } catch (error) { alert('메모리 저장 좆됨 ㅆㅂ'); }
    };

    const handleUserNoteSave = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/session/${sessionId}/usernote`, { userNote });
            if (res.data.success) alert('유저 노트 뇌리에 박아넣음 완!');
        } catch (error) { alert('유저 노트 저장 좆됨 ㅆㅂ'); }
    };

    if (!sessionId) return <div className="chat-container"><div className="chat-header">왼쪽에서 채팅방 골라라 파트너</div></div>;

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

                    {roomGuide && (
                        isGuideVisible ? (
                            <div className="room-guide-banner">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

                                    {/* 🚨 잼스 수술: 영역 꽉 잡아서 버튼 밀림 방지 & 마크다운 렌더링 빡! */}
                                    <div style={{ flex: 1, minWidth: 0, color: '#ccc', wordBreak: 'keep-all', lineHeight: '1.5', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#ffe600', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>📢 제작자 가이드:</span>
                                        <div className="guide-markdown-content">
                                            <ReactMarkdown>{roomGuide.replace(/\n/g, '  \n')}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* 🚨 절대 안 밀려나는 철벽 닫기 버튼 */}
                                    <button
                                        onClick={() => setIsGuideVisible(false)}
                                        style={{ background: 'transparent', border: '1px solid #888', borderRadius: '4px', color: '#888', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 8px', flexShrink: 0, marginLeft: '15px', marginTop: '2px' }}
                                    >
                                        ▲ 닫기
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                                <button
                                    className="guide-toggle-btn" /* 🚨 잼스 수술: CSS로 패기 위해 이름표 추가! */
                                    onClick={() => setIsGuideVisible(true)}
                                    style={{ background: 'rgba(255, 230, 0, 0.05)', border: '1px solid rgba(255, 230, 0, 0.3)', color: '#ffe600', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 15px', borderRadius: '20px', transition: 'all 0.2s' }}
                                >
                                    ▼ 가이드 펼치기
                                </button>
                            </div>
                        )
                    )}

                    <div className="chat-messages">
                        {messages.map((msg, index) => {
                            const displayContent = msg.content.replace(/\|\|asset_(tag|url):.*?\|\|/g, '').trim().replace(/\n/g, '  \n');
                            const turnNumber = messages.slice(0, index + 1).filter(m => m.role === 'assistant').length;

                            return (
                                <div key={index} className={`bubble-wrapper ${msg.role}`}>

                                    {/* 💬 1. 말풍선 본체 (먼저 렌더링해서 위에 띄움) */}
                                    {editingIndex === index ? (
                                        // 🚨 잼스 수술: 기존 말풍선 클래스를 그대로 써서 배경색/크기를 똑같이 유지함!
                                        <div className={`bubble ${msg.role}`} style={{ width: '100%', flexDirection: 'column' }}>
                                            <textarea
                                                className="edit-textarea"
                                                value={editContent}
                                                autoFocus // 🚨 잼스 보너스: 수정 누르자마자 커서 빡!
                                                onChange={(e) => {
                                                    setEditContent(e.target.value);
                                                    // 🚨 글자 칠 때마다 높이 자동 조절!
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${e.target.scrollHeight}px`;
                                                }}
                                                onKeyDown={(e) => {
                                                    // 🚨 단축키 1: ESC 누르면 바로 취소
                                                    if (e.key === 'Escape') {
                                                        handleEditCancel();
                                                    }
                                                    // 🚨 단축키 2: Shift + Enter는 줄바꿈, 그냥 Enter는 저장!
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault(); // 기본 엔터(줄바꿈) 방지
                                                        handleEditSave(index); // 저장 함수 실행!
                                                    }
                                                }}
                                                ref={(el) => {
                                                    // 🚨 처음 렌더링될 때 원래 글자 길이에 맞춰서 창 높이 쫙 늘려줌!
                                                    if (el) {
                                                        el.style.height = 'auto';
                                                        el.style.height = `${el.scrollHeight}px`;
                                                    }
                                                }}
                                            />
                                            <div className="edit-actions">
                                                <button className="save-btn" onClick={() => handleEditSave(index)}>저장</button>
                                                <button className="cancel-btn" onClick={handleEditCancel}>취소</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`bubble ${msg.role}`}>
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

                                    {/* ⚙️ 2. 액션 버튼 그룹 (말풍선 밑으로 이사 옴!) */}
                                    <div className="msg-actions">
                                        {msg.role === 'assistant' && (
                                            <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold', alignSelf: 'center', marginRight: '8px' }}>
                                                #{turnNumber}
                                            </span>
                                        )}
                                        <button className="action-btn edit-btn" onClick={() => handleEditStart(index, msg.content)}>✏️</button>
                                        {msg.role === 'assistant' && index === messages.length - 1 && (
                                            <button className="action-btn" onClick={handleReroll} title="리롤(재생성)">🎲</button>
                                        )}
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(index)}>🗑️</button>
                                    </div>

                                </div>
                            );
                        })}
                        {isLoading && <div className="bubble-wrapper assistant"><div className="bubble assistant">뇌 굴리는 중...</div></div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area" style={{ position: 'relative', alignItems: 'flex-end' }}>

                        {/* 🚨 잼스 수술: 1줄짜리 input 찢어버리고 다중 줄바꿈 되는 textarea로 승급! */}
                        <textarea
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                // 글자 많아지면 입력창 높이 자동으로 늘어나게!
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={(e) => {
                                // 🚨 Shift + Enter 누르면 줄바꿈, 그냥 Enter 누르면 전송!
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault(); // 전송할 땐 줄바꿈 방지
                                    sendMessage();
                                    e.target.style.height = 'auto'; // 전송 후 높이 초기화
                                }
                            }}
                            placeholder="야, 할 말 쳐봐... (Shift + Enter로 줄바꿈)"
                            disabled={isLoading}
                            rows="1"
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#1e1e24', color: '#fff', outline: 'none', resize: 'none', overflowY: 'auto', maxHeight: '150px', fontFamily: 'inherit', lineHeight: '1.5' }}
                        />

                        {/* 🚨 전송 버튼 (높이 고정 추가) */}
                        <button onClick={() => { sendMessage(); document.querySelector('.chat-input-area textarea').style.height = 'auto'; }} disabled={isLoading} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginLeft: '10px', height: '48px' }}>
                            <span style={{ fontSize: '1rem' }}>전송</span>
                            {currentCost > 0 && (
                                <span style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '-2px' }}>
                                    (예상 ${currentCost.toFixed(5)} / 약 {(currentCost * 1400).toFixed(2)}원)
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="chat-settings-sidebar">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>❌</button>
                        </div>
                        {/* 모델 선택 구역 */}
                        <div className="setting-section">
                            <label>🏢 1. 제조사 선택</label>
                            <select
                                value={selectedProvider}
                                onChange={(e) => {
                                    const newProvider = e.target.value;
                                    setSelectedProvider(newProvider);
                                    if (availableModels[newProvider] && availableModels[newProvider].length > 0) {
                                        setSelectedModel(availableModels[newProvider][0].id);
                                    }
                                }}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e24', color: '#fff', border: '1px solid #3f3f4e', borderRadius: '6px', outline: 'none', fontWeight: 'bold', marginBottom: '15px' }}
                                disabled={isLoading || Object.keys(availableModels).length === 0}
                            >
                                {Object.keys(availableModels).length > 0 ? (
                                    Object.keys(availableModels).sort().map(provider => (
                                        <option key={provider} value={provider}>{provider}</option>
                                    ))
                                ) : (
                                    <option>로딩 중...</option>
                                )}
                            </select>

                            <label>🧠 2. AI 뇌 교체 (모델 선택)</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e24', color: '#ffe600', border: '1px solid #3f3f4e', borderRadius: '6px', outline: 'none', fontWeight: 'bold' }}
                                disabled={isLoading || !availableModels[selectedProvider]}
                            >
                                {availableModels[selectedProvider] ? (
                                    availableModels[selectedProvider].map((m) => (
                                        <option key={m.id} value={m.id} style={{ color: 'white' }}>
                                            {m.name} (입력: ${Number(m.pricing?.prompt || 0).toFixed(5)})
                                        </option>
                                    ))
                                ) : (
                                    <option>제조사를 먼저 고르라고 ㅆㅂ</option>
                                )}
                            </select>
                        </div>

                        {/* 🚨 [신규 5] 기억력 조절 슬라이더 UI (프롬프트 다이어트용) */}
                        <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                            <label>✂️ 최근 대화 기억 한도 (Context Window)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <input
                                    type="range" min="1" max="50" step="1"
                                    value={contextLimit} onChange={(e) => setContextLimit(e.target.value)}
                                    disabled={isLoading}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#aaa' }}>
                                    <span>절약 모드 (1턴)</span>
                                    <span style={{ color: '#ffe600', fontWeight: 'bold' }}>{contextLimit}턴 기억</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                    * 한도를 줄이면 옛날 대화는 까먹지만 비용(토큰)이 획기적으로 줄어듭니다.
                                </span>
                            </div>
                        </div>

                        {/* 유저 노트 UI */}
                        <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                            <label>📝 유저 시크릿 노트 (이 방 전용 설정)</label>
                            <textarea
                                rows="4" value={userNote} onChange={(e) => setUserNote(e.target.value)}
                                placeholder="예: 지금 주인공은 부상을 당해 왼팔을 쓸 수 없음, 혹은 내 페르소나의 숨겨진 과거사 등..."
                                style={{ width: '100%', padding: '8px', backgroundColor: '#1e1e24', color: '#fff', border: '1px solid #3f3f4e', fontSize: '0.8rem', outline: 'none', borderRadius: '4px' }}
                            />
                            <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem', width: '100%', marginTop: '5px' }} onClick={handleUserNoteSave}>
                                유저 노트 동기화 빡!
                            </button>
                        </div>

                        {/* 스마트 메모리 구역 */}
                        <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                            <label>🧠 스마트 메모리 (오토 요약)</label>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: '0.8rem' }}>
                                <span>요약 주기 (턴)</span>
                                <input
                                    type="number" min="0" max="50" value={summaryInterval}
                                    onChange={(e) => setSummaryInterval(e.target.value)}
                                    style={{ width: '50px', backgroundColor: '#1e1e24', color: 'white', border: '1px solid #3f3f4e' }}
                                />
                            </div>
                            <textarea
                                rows="2" value={summaryPrompt} onChange={(e) => setSummaryPrompt(e.target.value)}
                                placeholder="어떻게 요약할지 지시어 입력 (예: 감정선 위주로 요약해라)"
                                style={{ width: '100%', padding: '8px', backgroundColor: '#1e1e24', color: 'white', border: '1px solid #3f3f4e', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <label style={{ marginTop: '10px', color: '#888' }}>현재 뇌에 박힌 요약본 (직접 수정 가능)</label>
                            <textarea
                                rows="4" value={memorySummary} onChange={(e) => setMemorySummary(e.target.value)}
                                placeholder="현재 저장된 요약 내용이 없습니다."
                                style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', color: '#ffe600', border: '1px solid #3f3f4e', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem', width: '100%' }} onClick={handleMemorySave}>
                                메모리 업데이트 빡!
                            </button>
                        </div>

                        {/* 페르소나 관리 구역 */}
                        <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                            <label>🎭 내 페르소나 관리</label>
                            <div className="persona-control-group">
                                <select
                                    className="persona-select" value={currentPersonaId}
                                    onChange={(e) => {
                                        handlePersonaChange(e);
                                        setIsEditingPersona(false); setIsCreatingPersona(false);
                                    }}
                                >
                                    <option value="">캐릭터 선택</option>
                                    {personasList.map(p => (<option key={p._id} value={p._id}>{p.name}</option>))}
                                </select>
                                <div className="persona-btn-row">
                                    <button className="persona-mini-btn edit" style={{ backgroundColor: '#ffe600', color: '#000' }} onClick={() => { setIsCreatingPersona(!isCreatingPersona); setIsEditingPersona(false); }}>
                                        {isCreatingPersona ? '취소' : '➕ 새 프로필'}
                                    </button>
                                    {currentPersonaId && !isCreatingPersona && (
                                        <>
                                            <button className="persona-mini-btn edit" onClick={() => {
                                                const active = personasList.find(p => p._id === currentPersonaId);
                                                setPersonaEditName(active?.name || ''); setPersonaEditDesc(active?.description || '');
                                                setIsEditingPersona(!isEditingPersona);
                                            }}>
                                                {isEditingPersona ? '취소' : '✏️ 수정'}
                                            </button>
                                            <button className="persona-mini-btn delete" onClick={handlePersonaDelete}>🗑️ 삭제</button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isCreatingPersona && (
                                <div className="persona-edit-form" style={{ border: '1px solid #ffe600' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#ffe600', fontWeight: 'bold' }}>✨ 신규 페르소나 등록</span>
                                    <input type="text" value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} placeholder="프로필 이름 (예: 천재 해커 파트너)" />
                                    <textarea rows="3" value={newPersonaDesc} onChange={(e) => setNewPersonaDesc(e.target.value)} placeholder="나이, 성격, 외모 설정을 디테일하게 치셈..." />
                                    <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem' }} onClick={handlePersonaCreate}>프로필 생성 빡!</button>
                                </div>
                            )}

                            {isEditingPersona && (
                                <div className="persona-edit-form">
                                    <input type="text" value={personaEditName} onChange={(e) => setPersonaEditName(e.target.value)} placeholder="프로필 이름" />
                                    <textarea rows="3" value={personaEditDesc} onChange={(e) => setPersonaEditDesc(e.target.value)} placeholder="상세 설정 기입..." />
                                    <button className="save-btn" style={{ padding: '6px', fontSize: '0.8rem' }} onClick={handlePersonaUpdate}>프로필 변경사항 저장</button>
                                </div>
                            )}
                        </div>

                        <div className="setting-section" style={{ borderTop: '1px solid #3f3f4e', paddingTop: '15px' }}>
                            <label>🔥 똘끼 (Temperature)</label>
                            <input type="range" min="0" max="0.8" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} disabled={isLoading} />
                            <div className="setting-value">{temperature}</div>
                        </div>

                        <div className="setting-section">
                            <label>📝 최대 길이 (Max Tokens)</label>
                            <input type="range" min="100" max="5000" step="100" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} disabled={isLoading} />
                            <div className="setting-value">{maxTokens}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatRoom;