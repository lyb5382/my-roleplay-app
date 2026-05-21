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
    const [selectedProvider, setSelectedProvider] = useState('QWEN');
    const [summaryPrompt, setSummaryPrompt] = useState('이전 대화의 핵심 내용과 현재 상황을 3문장 이내로 요약해라.');
    const [availableModels, setAvailableModels] = useState({});
    const [memorySummary, setMemorySummary] = useState('');
    const [visualAssets, setVisualAssets] = useState([]);
    const [activeVisualUrl, setActiveVisualUrl] = useState('');
    const [selectedModel, setSelectedModel] = useState('qwen/qwen-2.5-72b-instruct');
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

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await axios.get('https://openrouter.ai/api/v1/models');
                const sortedModels = res.data.data.sort((a, b) => a.name.localeCompare(b.name));

                // 🚨 잼스가 엄선한 VIP 제조사 라인업 (이거 말고는 입장 컷)
                const allowedProviders = [
                    'GOOGLE',       // 제미니
                    'ANTHROPIC',    // 클로드
                    'OPENAI',       // GPT
                    'META',         // 라마 (오픈소스 대장)
                    'QWEN',         // 큐원 (가성비 원탑)
                    'MISTRAL',      // 미스트랄 (무검열 특화)
                    'COHERE',       // 커맨드 R (캐릭터 연기 장인)
                    'NOUSRESEARCH', // 헤르메스 (과몰입 변태들)
                    'DEEPSEEK'      // 딥시크 (요즘 폼 미침)
                ];

                const grouped = sortedModels.reduce((acc, model) => {
                    const provider = model.id.split('/')[0].toUpperCase();

                    // 💡 배열에 있는 VIP 제조사일 때만 방에 들여보내줌
                    if (allowedProviders.includes(provider)) {
                        if (!acc[provider]) acc[provider] = [];
                        acc[provider].push(model);
                    }
                    return acc;
                }, {});

                setAvailableModels(grouped);
            } catch (error) {
                console.error('❌ 모델 리스트 털기 좆됨:', error);
            }
        };
        fetchModels();
    }, []);

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
                maxTokens: Number(maxTokens),
                model: selectedModel // 🚨 추가!
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
                maxTokens: Number(maxTokens),
                model: selectedModel // 🚨 추가!
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
                                    <div className="msg-actions">
                                        <button className="action-btn edit-btn" onClick={() => handleEditStart(index, msg.content)}>✏️</button>

                                        {/* 🚨 마지막 턴이고 AI 메시지일 때만 리롤 버튼(🎲) 띄워주기 */}
                                        {msg.role === 'assistant' && index === messages.length - 1 && (
                                            <button className="action-btn" onClick={handleReroll} title="리롤(재생성)">🎲</button>
                                        )}

                                        <button className="action-btn delete-btn" onClick={() => handleDelete(index)}>🗑️</button>
                                    </div>

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
                            <label>🏢 1. 제조사 선택</label>
                            <select
                                value={selectedProvider}
                                onChange={(e) => {
                                    const newProvider = e.target.value;
                                    setSelectedProvider(newProvider);
                                    // 💡 잼스의 센스: 제조사 바꿨을 때, 에러 안 나게 그 제조사의 첫 번째 모델로 자동 세팅해 줌!
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