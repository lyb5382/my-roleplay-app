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
                                : [{ trigger: '', action: '', priority: 1 }],
                            thumbnailUrl: char.thumbnailUrl || ''
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

                {/* 🚨 테스트 탭이 아닐 때만 폼 스크롤 구역을 렌더링! */}
                {activeTab !== 'test' && (
                    <div className="studio-form-scroll">

                        {/* 1. 메인 탭 */}
                        {activeTab === 'main' && (
                            <div className="tab-content">
                                <h3>📝 기본 메타데이터</h3>
                                <div className="form-group"><label>작품 이름</label><input type="text" name="title" value={characterData.title || ''} onChange={handleChange} placeholder="작품 이름을 입력하세요..." /></div>
                                <div className="form-group"><label>한 줄 요약</label><input type="text" name="summary" value={characterData.summary || ''} onChange={handleChange} placeholder="작품을 한 줄로 소개하세요..." /></div>

                                <div className="form-group">
                                    <label>🏢 1. 제조사 선택 (권장 모델 지정용)</label>
                                    <select
                                        value={selectedProvider || ''}
                                        onChange={(e) => {
                                            const newProvider = e.target.value;
                                            setSelectedProvider(newProvider);
                                            if (availableModels[newProvider] && availableModels[newProvider].length > 0) {
                                                const firstModelId = availableModels[newProvider][0].id;
                                                setCharacterData(prev => ({ ...prev, defaultModel: firstModelId }));
                                            }
                                        }}
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
                                </div>

                                <div className="form-group">
                                    <label>🧠 2. AI 뇌 교체 (권장 모델 최종 선택)</label>
                                    <select
                                        name="defaultModel"
                                        value={characterData.defaultModel || ''}
                                        onChange={handleChange}
                                        disabled={!availableModels[selectedProvider]}
                                    >
                                        {availableModels[selectedProvider] ? (
                                            availableModels[selectedProvider].map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} (입력: ${Number(m.pricing?.prompt || 0).toFixed(5)} / ₩{(Number(m.pricing?.prompt || 0) * 1400).toFixed(2)})
                                                </option>
                                            ))
                                        ) : (
                                            <option>제조사를 먼저 고르라고 ㅆㅂ</option>
                                        )}
                                    </select>
                                </div>

                                <div className="form-group"><label>상세 설명 작성</label><textarea name="description" rows="5" value={characterData.description || ''} onChange={handleChange} placeholder="세계관과 배경을 상세히 묘사하세요..." /></div>
                                <div className="form-group"><label>썸네일 등록 (URL)</label><input type="text" name="thumbnailUrl" value={characterData.thumbnailUrl || ''} onChange={handleChange} placeholder="대표 썸네일 이미지 URL..." /></div>
                            </div>
                        )}

                        {/* 2. 프롬프트 탭 */}
                        {activeTab === 'prompt' && (
                            <div className="tab-content">
                                <h3>🧠 프롬프트 코어</h3>
                                <div className="form-group"><label>시스템 프롬프트 (무제한)</label><textarea name="systemPrompt" rows="15" value={characterData.systemPrompt || ''} onChange={handleChange} placeholder="AI가 어떻게 행동할지 지시하세요..." /></div>
                                <div className="toggle-group">
                                    <input type="checkbox" id="gl" checked={characterData.useGuideline} onChange={(e) => setCharacterData({ ...characterData, useGuideline: e.target.checked })} />
                                    <label htmlFor="gl">탈옥 방지 '절대 규칙' 활성화</label>
                                </div>
                                {characterData.useGuideline && (
                                    <div className="form-group">
                                        <textarea name="guideline" rows="5" value={characterData.guideline || ''} onChange={handleChange} placeholder="AI가 절대 어기면 안 되는 규칙..." />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. 프롤로그 탭 */}
                        {activeTab === 'prologue' && (
                            <div className="tab-content">
                                <h3>🎭 멀티 프롤로그 (최대 3개)</h3>
                                {characterData.prologues.map((p, i) => (
                                    <div key={i} className="prologue-card">
                                        <h4>프롤로그 #{i + 1}</h4>
                                        <div className="form-group"><label>프롤로그 타이틀</label><input type="text" value={p.title || ''} onChange={(e) => handlePrologueChange(i, 'title', e.target.value)} placeholder="루트 제목 (예: 감옥에서 시작)" /></div>

                                        {/* 🚨 잼스 수술: 플레이 가이드 텍스트 상자로 변경 & 실시간 마크다운 프리뷰 추가 */}
                                        <div className="form-group">
                                            <label>플레이 가이드 (마크다운 지원)</label>
                                            <textarea
                                                rows="3"
                                                value={p.guide || ''}
                                                onChange={(e) => handlePrologueChange(i, 'guide', e.target.value)}
                                                placeholder="유저에게 보여줄 지침 (**, *, \n 등 지원)..."
                                            />
                                            {/* 입력된 가이드가 있을 때만 노란 점선 상자에 미리보기 띄움! */}
                                            {p.guide && (
                                                <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px dashed #ffe600', borderRadius: '4px', marginTop: '-5px' }}>
                                                    <span style={{ fontSize: '0.75rem', color: '#ffe600', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>👁️ 마크다운 미리보기</span>
                                                    <div style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                                        <ReactMarkdown>{p.guide.replace(/\n/g, '  \n')}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group"><label>초기 상황 설명 (프롤로그 본문)</label><textarea rows="5" value={p.description || ''} onChange={(e) => handlePrologueChange(i, 'description', e.target.value)} placeholder="첫 대화로 출력될 상황 묘사..." /></div>
                                    </div>
                                ))}
                                <button className="studio-add-btn" onClick={addPrologue}>➕ 프롤로그 추가</button>
                            </div>
                        )}

                        {/* 4. 이미지 탭 */}
                        {activeTab === 'image' && (
                            <div className="tab-content">
                                <h3>🖼️ 멀티 비주얼 에셋 스튜디오</h3>
                                <p className="help-text">
                                    * 배경, 캐릭터 표정, 아이템 이미지를 등록하세요.<br />
                                    * 각 이미지의 <strong style={{ color: '#ffe600' }}>상황 설명</strong>을 자세히 적어두면 AI가 자동으로 불러옵니다.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {characterData.visualAssets.map((asset, index) => (
                                        <div key={index} className={`keyword-card ${asset.tag === 'default' ? 'default-asset' : ''}`}>
                                            <div className="asset-header">
                                                <span>📷 이미지 에셋 #{index + 1} {asset.tag === 'default' && '(메인 대표)'}</span>
                                                {asset.tag !== 'default' && (
                                                    <button className="delete-asset-btn" onClick={() => deleteAsset(index)}>🗑️ 삭제</button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                                <div className="form-group" style={{ flex: '0 0 200px', marginBottom: 0 }}>
                                                    <label>태그 (영문)</label>
                                                    <input type="text" value={asset.tag || ''} onChange={(e) => handleAssetChange(index, 'tag', e.target.value)} placeholder="예: angry" disabled={asset.tag === 'default'} />
                                                </div>
                                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                                    <label>이미지 URL</label>
                                                    <input type="text" value={asset.url || ''} onChange={(e) => handleAssetChange(index, 'url', e.target.value)} placeholder="이미지 호스팅 주소..." />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label>출력 조건 (상황 설명)</label>
                                                <input type="text" value={asset.description || ''} onChange={(e) => handleAssetChange(index, 'description', e.target.value)} placeholder="이 이미지가 떠야 하는 상황..." />
                                            </div>
                                        </div>
                                    ))}
                                    <button className="studio-add-btn" onClick={addAsset}>➕ 새 이미지 등록칸 추가</button>
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
                                            <label>트리거 키워드 (쉼표 구분)</label>
                                            <input type="text" value={k.trigger || ''} onChange={(e) => handleKeywordChange(i, 'trigger', e.target.value)} placeholder="예: 공격, 방어" />
                                        </div>
                                        <div className="form-group">
                                            <label>발동될 프롬프트 지시어</label>
                                            <textarea rows="3" value={k.action || ''} onChange={(e) => handleKeywordChange(i, 'action', e.target.value)} placeholder="키워드 인식 시 AI에게 내릴 강제 명령..." />
                                        </div>
                                    </div>
                                ))}
                                <button className="studio-add-btn" onClick={addKeyword}>➕ 명령어 추가</button>
                            </div>
                        )}
                    </div>
                )}

                {/* 🚨 6. 테스트 탭일 때만 샌드박스를 전체 화면으로 렌더링! */}
                {activeTab === 'test' && (
                    <div className="sandbox-tester full-width">
                        <div className="sandbox-header">🧪 SANDBOX TESTER (현재 설정 기반 시뮬레이터)</div>
                        {activeVisualUrl && (
                            <div style={{ width: '100%', height: '300px', background: `#111 url(${activeVisualUrl}) center/cover no-repeat`, borderBottom: '1px solid #3f3f4e' }} />
                        )}
                        <div className="chat-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {sandboxMessages.map((msg, index) => (
                                <div key={index} className={`bubble-wrapper ${msg.role}`} style={{ flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <div className={`bubble ${msg.role}`} style={{ maxWidth: '75%', backgroundColor: msg.role === 'user' ? '#ffe600' : '#2b2b36', color: msg.role === 'user' ? '#000' : '#fff', padding: '12px 16px', borderRadius: '12px' }}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isSandboxLoading && <div style={{ color: '#888', fontStyle: 'italic', paddingLeft: '10px' }}>잼스 생각 중...</div>}
                        </div>
                        <div className="chat-input-area" style={{ padding: '15px', background: '#2b2b36', display: 'flex' }}>
                            <input
                                type="text" value={sandboxInput || ''} onChange={(e) => setSandboxInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendSandboxMessage()}
                                placeholder={isSandboxLoading ? '대답 기다려라...' : '테스트 메시지 입력...'}
                                disabled={isSandboxLoading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#1e1e24', color: '#fff', outline: 'none' }}
                            />
                            <button onClick={sendSandboxMessage} disabled={isSandboxLoading} style={{ marginLeft: '10px', padding: '0 25px', borderRadius: '8px', border: 'none', background: '#ffe600', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>전송</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorStudio;