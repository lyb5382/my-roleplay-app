// 🚨 잼스 검거: 여기서 useEffect를 꼭 임포트해야 됨!!!
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './CreatorStudio.css';

const CreatorStudio = ({ editCharId, onGoHome }) => {
    const [activeTab, setActiveTab] = useState('main');
    const [sandboxMessages, setSandboxMessages] = useState([]);
    const [sandboxInput, setSandboxInput] = useState('');
    const [isSandboxLoading, setIsSandboxLoading] = useState(false);
    const [activeVisualUrl, setActiveVisualUrl] = useState('');
    const [availableModels, setAvailableModels] = useState({});
    const [selectedProvider, setSelectedProvider] = useState('QWEN');

    // 🚨 오픈라우터에서 뇌 목록 털어오기
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

    // --- [상태 관리 데이터] ---
    const [characterData, setCharacterData] = useState({
        title: '', summary: '', description: '',
        visualAssets: [
            { tag: 'default', url: '', description: '캐릭터의 기본 평상시 모습 및 메인 대표 이미지' }
        ],
        systemPrompt: '', guideline: '', useGuideline: false,
        // 🚨 권장 AI 뇌 기본값 세팅
        defaultModel: 'qwen/qwen-2.5-72b-instruct',
        prologues: [{ title: '', guide: '', description: '' }],
        keywords: [{ trigger: '', action: '', priority: 1 }]
    });

    useEffect(() => {
        if (editCharId) {
            const fetchCharacter = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/character/${editCharId}`);
                    if (res.data.success) {
                        const char = res.data.character;
                        setCharacterData({
                            title: char.title || '',
                            summary: char.summary || '',
                            description: char.description || '',
                            systemPrompt: char.systemPrompt || '',
                            guideline: char.guideline || '',
                            useGuideline: !!char.guideline,
                            // 🚨 기존에 저장된 권장 AI 뇌 불러오기
                            defaultModel: char.defaultModel || 'qwen/qwen-2.5-72b-instruct',
                            visualAssets: char.visualAssets && char.visualAssets.length > 0
                                ? char.visualAssets
                                : [{ tag: 'default', url: '', description: '' }],
                            prologues: char.prologues && char.prologues.length > 0
                                ? char.prologues
                                : [{ title: '', guide: '', description: '' }],
                            keywords: char.keywords && char.keywords.length > 0
                                ? char.keywords
                                : [{ trigger: '', action: '', priority: 1 }]
                        });
                    }
                } catch (error) {
                    console.error('기존 데이터 불러오기 좆됨:', error);
                }
            };
            fetchCharacter();
        }
    }, [editCharId]);

    // 🖼️ 통합 에셋 변경 핸들러
    const handleAssetChange = (index, field, value) => {
        const newAssets = [...characterData.visualAssets];
        newAssets[index][field] = value;
        setCharacterData(prev => ({ ...prev, visualAssets: newAssets }));
    };

    const addAsset = () => {
        setCharacterData(prev => ({
            ...prev,
            visualAssets: [...prev.visualAssets, { tag: '', url: '', description: '' }]
        }));
    };

    const deleteAsset = (index) => {
        if (characterData.visualAssets[index].tag === 'default') return alert('default 이미지는 메인 썸네일이라 지우면 안 돼 파트너');
        const newAssets = [...characterData.visualAssets];
        newAssets.splice(index, 1);
        setCharacterData(prev => ({ ...prev, visualAssets: newAssets }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCharacterData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrologueChange = (index, field, value) => {
        const newPrologues = [...characterData.prologues];
        newPrologues[index][field] = value;
        setCharacterData(prev => ({ ...prev, prologues: newPrologues }));
    };

    const addPrologue = () => {
        if (characterData.prologues.length >= 3) return alert('프롤로그는 최대 3개까지만 가능하다 파트너');
        setCharacterData(prev => ({ ...prev, prologues: [...prev.prologues, { title: '', guide: '', description: '' }] }));
    };

    const handleKeywordChange = (index, field, value) => {
        const newKeywords = [...characterData.keywords];
        newKeywords[index][field] = value;
        setCharacterData(prev => ({ ...prev, keywords: newKeywords }));
    };

    const addKeyword = () => {
        setCharacterData(prev => ({ ...prev, keywords: [...prev.keywords, { trigger: '', action: '', priority: prev.keywords.length + 1 }] }));
    };

    const handleLaunch = async () => {
        try {
            const formattedKeywords = characterData.keywords.map(k => ({
                ...k,
                trigger: Array.isArray(k.trigger) ? k.trigger : k.trigger.split(',').map(t => t.trim()).filter(t => t !== '')
            }));

            const payload = {
                ...characterData,
                guideline: characterData.useGuideline ? characterData.guideline : '',
                keywords: formattedKeywords
            };

            if (editCharId) {
                const res = await axios.put(`http://localhost:5000/api/character/${editCharId}`, payload);
                if (res.data.success) {
                    alert(`✨ [${characterData.title}] 수정 완료! 메인으로 돌아간다.`);
                    if (onGoHome) onGoHome();
                }
            } else {
                const res = await axios.post('http://localhost:5000/api/character/create', payload);
                if (res.data.success) {
                    alert(`✨ 조물주 펀치! [${characterData.title}] 세계관 창조 완료!`);
                    if (onGoHome) onGoHome();
                }
            }
        } catch (error) {
            console.error(error);
            alert('런칭/수정 실패 ㅆㅂ 백엔드 터짐');
        }
    };

    const sendSandboxMessage = async () => {
        if (!sandboxInput.trim() || isSandboxLoading) return;

        const userMsg = { role: 'user', content: sandboxInput };
        const updatedMessages = [...sandboxMessages, userMsg];

        setSandboxMessages(updatedMessages);
        setSandboxInput('');
        setIsSandboxLoading(true);

        try {
            const res = await axios.post('http://localhost:5000/api/character/sandbox/test', {
                ...characterData,
                messages: updatedMessages
            });

            if (res.data.success) {
                let aiReply = res.data.reply;

                const tagMatch = aiReply.match(/\|\|asset_tag:(.*?)\|\|/);
                const urlMatch = aiReply.match(/\|\|asset_url:(.*?)\|\|/);
                if (urlMatch) {
                    setActiveVisualUrl(urlMatch[1].trim());
                } else if (tagMatch && tagMatch[1]) {
                    const matchedTag = tagMatch[1].trim();
                    const asset = characterData.visualAssets.find(a => a.tag === matchedTag);
                    if (asset && asset.url) setActiveVisualUrl(asset.url);
                }

                aiReply = aiReply.replace(/\|\|asset_(tag|url):.*?\|\|/g, '').trim();
                setSandboxMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
            }
        } catch (error) {
            console.error(error);
            setSandboxMessages(prev => [...prev, { role: 'system', content: '❌ 테스트 API 통신 좆됨 씨발.' }]);
        } finally {
            setIsSandboxLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'test' && sandboxMessages.length === 0) {
            const firstPrologue = characterData.prologues[0]?.description;
            const defaultImg = characterData.visualAssets.find(a => a.tag === 'default')?.url;
            if (defaultImg) setActiveVisualUrl(defaultImg);
            if (firstPrologue) {
                setSandboxMessages([{ role: 'assistant', content: firstPrologue }]);
            }
        }
    }, [activeTab]);

    return (
        <div className="studio-container">
            <div className="studio-nav">
                {['main', 'prompt', 'prologue', 'image', 'command', 'test'].map((tab) => (
                    <button
                        key={tab}
                        className={`studio-nav-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'main' && '메인'}
                        {tab === 'prompt' && '프롬프트'}
                        {tab === 'prologue' && '프롤로그'}
                        {tab === 'image' && '이미지'}
                        {tab === 'command' && '명령어'}
                        {tab === 'test' && '테스트'}
                    </button>
                ))}
                <button className="studio-nav-btn" style={{ marginLeft: 'auto', color: '#ffe600' }} onClick={handleLaunch}>🚀 캐릭터 런칭</button>
            </div>

            <div className="studio-work-area">
                <div className="studio-form-scroll">

                    {/* 1. 메인 탭 */}
                    {activeTab === 'main' && (
                        <div className="tab-content">
                            <h3>📝 기본 메타데이터</h3>
                            <div className="form-group"><label>작품 이름</label><input type="text" name="title" value={characterData.title} onChange={handleChange} /></div>
                            <div className="form-group"><label>한 줄 요약</label><input type="text" name="summary" value={characterData.summary} onChange={handleChange} /></div>

                            {/* 🚨 2단 필터링 적용된 권장 AI 뇌 세팅 구역! */}
                            <div className="form-group">
                                <label>🏢 1. 제조사 선택 (권장 모델 지정용)</label>
                                <select
                                    value={selectedProvider}
                                    onChange={(e) => {
                                        const newProvider = e.target.value;
                                        setSelectedProvider(newProvider);
                                        // 💡 제조사 바꿀 때, 해당 제조사의 첫 번째 모델을 defaultModel로 자동 세팅!
                                        if (availableModels[newProvider] && availableModels[newProvider].length > 0) {
                                            const firstModelId = availableModels[newProvider][0].id;
                                            setCharacterData(prev => ({ ...prev, defaultModel: firstModelId }));
                                        }
                                    }}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e24', color: '#fff', border: '1px solid #3f3f4e', borderRadius: '6px', outline: 'none', fontWeight: 'bold', marginBottom: '15px' }}
                                    disabled={Object.keys(availableModels).length === 0}
                                >
                                    {Object.keys(availableModels).length > 0 ? (
                                        Object.keys(availableModels).sort().map(provider => (
                                            <option key={provider} value={provider}>{provider}</option>
                                        ))
                                    ) : (
                                        <option>로딩 중...</option>
                                    )}
                                </select>

                                <label>🧠 2. AI 뇌 교체 (권장 모델 최종 선택)</label>
                                <select
                                    name="defaultModel" // 🚨 name 속성 살려둠 (handleChange용)
                                    value={characterData.defaultModel} // 🚨 선택된 값은 characterData.defaultModel 바라보게!
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#1e1e24', color: '#ffe600', border: '1px solid #3f3f4e', borderRadius: '6px', outline: 'none', fontWeight: 'bold' }}
                                    disabled={!availableModels[selectedProvider]}
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

                            <div className="form-group"><label>상세 설명 작성</label><textarea name="description" rows="5" value={characterData.description} onChange={handleChange} /></div>
                            <div className="form-group"><label>썸네일 등록 (URL)</label><input type="text" name="thumbnailUrl" value={characterData.thumbnailUrl} onChange={handleChange} /></div>
                        </div>
                    )}

                    {/* 2. 프롬프트 탭 */}
                    {activeTab === 'prompt' && (
                        <div className="tab-content">
                            <h3>🧠 프롬프트 코어</h3>
                            <div className="form-group"><label>시스템 프롬프트 (무제한)</label><textarea name="systemPrompt" rows="15" value={characterData.systemPrompt} onChange={handleChange} /></div>
                            <div className="toggle-group">
                                <input type="checkbox" id="gl" checked={characterData.useGuideline} onChange={(e) => setCharacterData({ ...characterData, useGuideline: e.target.checked })} />
                                <label htmlFor="gl">탈옥 방지 '절대 규칙' 활성화</label>
                            </div>
                            {characterData.useGuideline && <textarea name="guideline" rows="5" value={characterData.guideline} onChange={handleChange} placeholder="AI가 절대 어기면 안 되는 규칙..." />}
                        </div>
                    )}

                    {/* 3. 프롤로그 탭 */}
                    {activeTab === 'prologue' && (
                        <div className="tab-content">
                            <h3>🎭 멀티 프롤로그 (최대 3개)</h3>
                            {characterData.prologues.map((p, i) => (
                                <div key={i} className="prologue-card">
                                    <h4>프롤로그 #{i + 1}</h4>
                                    <div className="form-group"><label>프롤로그 타이틀</label><input type="text" value={p.title} onChange={(e) => handlePrologueChange(i, 'title', e.target.value)} /></div>
                                    <div className="form-group"><label>플레이 가이드</label><input type="text" value={p.guide} onChange={(e) => handlePrologueChange(i, 'guide', e.target.value)} /></div>
                                    <div className="form-group"><label>초기 상황 설명 (프롤로그 본문)</label><textarea rows="5" value={p.description} onChange={(e) => handlePrologueChange(i, 'description', e.target.value)} /></div>
                                </div>
                            ))}
                            <button className="nav-buttons" onClick={addPrologue}>+ 프롤로그 추가</button>
                        </div>
                    )}

                    {/* 4. 이미지 탭 */}
                    {activeTab === 'image' && (
                        <div className="tab-content">
                            <h3>🖼️ 멀티 비주얼 에셋 스튜디오</h3>
                            <p style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '15px' }}>
                                * 배경, 캐릭터 표정, 특정 아이템 등 필요한 이미지를 제한 없이 등록하세요.<br />
                                * 각 이미지의 <strong style={{ color: '#ffe600' }}>상황 설명</strong>을 자세히 적어두면, AI가 롤플레잉 도중 맥락을 분석해 알맞은 이미지를 자동으로 소환합니다.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {characterData.visualAssets.map((asset, index) => (
                                    <div key={index} className="keyword-card" style={{ borderColor: asset.tag === 'default' ? '#ffe600' : '#3f3f4e' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontWeight: 'bold', color: asset.tag === 'default' ? '#ffe600' : '#fff' }}>
                                                📷 이미지 에셋 #{index + 1} {asset.tag === 'default' && '(메인 대표)'}
                                            </span>
                                            {asset.tag !== 'default' && (
                                                <button className="nav-buttons" style={{ padding: '3px 8px', backgroundColor: '#ff4d4d', fontSize: '0.8rem' }} onClick={() => deleteAsset(index)}>
                                                    🗑️ 이미지 제거
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                            <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
                                                <label>이미지 이름 (태그)</label>
                                                <input
                                                    type="text" value={asset.tag}
                                                    onChange={(e) => handleAssetChange(index, 'tag', e.target.value)}
                                                    placeholder="예: angry_face" disabled={asset.tag === 'default'}
                                                />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                <label>이미지 URL 링크</label>
                                                <input
                                                    type="text" value={asset.url}
                                                    onChange={(e) => handleAssetChange(index, 'url', e.target.value)}
                                                    placeholder="호스팅 서버의 이미지 URL 복붙..."
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label>이 이미지가 출력될 조건/상황 설명</label>
                                            <input
                                                type="text" value={asset.description}
                                                onChange={(e) => handleAssetChange(index, 'description', e.target.value)}
                                                placeholder="예: 주인공에게 화가 나서 소리를 지를 때"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <button className="nav-buttons" style={{ marginTop: '10px', padding: '12px' }} onClick={addAsset}>
                                    ➕ 새로운 이미지 등록칸 추가
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 5. 명령어 탭 */}
                    {activeTab === 'command' && (
                        <div className="tab-content">
                            <h3>⚡ 키워드 트리거 시스템</h3>
                            {characterData.keywords.map((k, i) => (
                                <div key={i} className="keyword-card">
                                    <span className="priority-badge">{k.priority}순위</span>
                                    <div className="form-group">
                                        <label>트리거 키워드 (쉼표로 여러 개 입력 가능)</label>
                                        <input
                                            type="text" value={k.trigger}
                                            onChange={(e) => handleKeywordChange(i, 'trigger', e.target.value)}
                                            placeholder="예: 공격, 전투, 칼빵 (쉼표로 구분)"
                                        />
                                    </div>
                                    <div className="form-group"><label>발동될 숨겨진 프롬프트/행동</label><textarea rows="3" value={k.action} onChange={(e) => handleKeywordChange(i, 'action', e.target.value)} /></div>
                                </div>
                            ))}
                            <button className="nav-buttons" onClick={addKeyword}>+ 명령어 추가</button>
                        </div>
                    )}

                    {/* 6. 테스트 탭 */}
                    {activeTab === 'test' && (
                        <div className="tab-content">
                            <h3>🧪 샌드박스 테스터</h3>
                            <p>우측 샌드박스 창에서 현재 설정으로 즉석 대화가 가능합니다.</p>
                            <p style={{ color: '#888' }}>* 새로고침 시 테스트 대화 내역은 휘발됩니다.</p>
                        </div>
                    )}
                </div>

                {/* 우측 샌드박스 테스터 */}
                <div className="sandbox-tester">
                    <div className="sandbox-header">SANDBOX TESTER</div>
                    {activeVisualUrl && (
                        <div style={{ width: '100%', height: '150px', background: `#111 url(${activeVisualUrl}) center/cover no-repeat`, borderBottom: '1px solid #3f3f4e' }} />
                    )}
                    <div className="chat-messages" style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        {sandboxMessages.map((msg, index) => (
                            <div
                                key={index}
                                className={`bubble ${msg.role}`}
                                style={{
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    backgroundColor: msg.role === 'user' ? '#ffe600' : '#2b2b36',
                                    color: msg.role === 'user' ? '#000' : '#fff',
                                    maxWidth: '85%', padding: '8px 12px', borderRadius: '8px'
                                }}
                            >
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        ))}
                        {isSandboxLoading && <div style={{ color: '#888', fontStyle: 'italic', paddingLeft: '5px' }}>잼스 생각 중...</div>}
                    </div>

                    <div className="chat-input-area" style={{ padding: '10px', background: '#2b2b36' }}>
                        <input
                            type="text" value={sandboxInput} onChange={(e) => setSandboxInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendSandboxMessage()}
                            placeholder={isSandboxLoading ? '대답 기다려라...' : '테스트 메시지 입력...'}
                            disabled={isSandboxLoading} style={{ fontSize: '0.85rem', padding: '8px' }}
                        />
                        <button onClick={sendSandboxMessage} disabled={isSandboxLoading} style={{ padding: '0 15px', fontSize: '0.85rem' }}>전송</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatorStudio;