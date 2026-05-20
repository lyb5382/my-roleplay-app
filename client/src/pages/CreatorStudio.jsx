import React, { useState } from 'react';
import axios from 'axios';
import './CreatorStudio.css';

const CreatorStudio = () => {
    const [activeTab, setActiveTab] = useState('main'); // [main, prompt, prologue, image, command, test]

    // --- [상태 관리 데이터] ---
    const [characterData, setCharacterData] = useState({
        title: '', summary: '', description: '', thumbnailUrl: '', backgroundUrl: '',
        systemPrompt: '', guideline: '', useGuideline: false,
        prologues: [{ title: '', guide: '', description: '' }], // 최대 3개
        keywords: [{ trigger: '', action: '', priority: 1 }] // 명령어 시스템
    });

    // --- [데이터 핸들러] ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCharacterData(prev => ({ ...prev, [name]: value }));
    };

    // 프롤로그 추가/수정
    const handlePrologueChange = (index, field, value) => {
        const newPrologues = [...characterData.prologues];
        newPrologues[index][field] = value;
        setCharacterData(prev => ({ ...prev, prologues: newPrologues }));
    };

    const addPrologue = () => {
        if (characterData.prologues.length >= 3) return alert('프롤로그는 최대 3개까지만 가능하다 파트너');
        setCharacterData(prev => ({ ...prev, prologues: [...prev.prologues, { title: '', guide: '', description: '' }] }));
    };

    // 키워드 트리거 추가/수정
    const handleKeywordChange = (index, field, value) => {
        const newKeywords = [...characterData.keywords];
        newKeywords[index][field] = value;
        setCharacterData(prev => ({ ...prev, keywords: newKeywords }));
    };

    const addKeyword = () => {
        setCharacterData(prev => ({ ...prev, keywords: [...prev.keywords, { trigger: '', action: '', priority: prev.keywords.length + 1 }] }));
    };

    // 🚀 DB 런칭
    // 🚀 DB 런칭 (쉼표로 키워드 쪼개는 마법 추가)
    const handleLaunch = async () => {
        try {
            // 💡 키워드 배열을 순회하면서 trigger 텍스트를 쉼표(,) 기준으로 쪼개서 배열로 변환함
            const formattedKeywords = characterData.keywords.map(k => ({
                ...k,
                // "사과, 바나나, 포도" -> ["사과", "바나나", "포도"] 이렇게 쪼개고 빈칸 없앰
                trigger: k.trigger.split(',').map(t => t.trim()).filter(t => t !== '')
            }));

            const payload = {
                ...characterData,
                guideline: characterData.useGuideline ? characterData.guideline : '',
                keywords: formattedKeywords // 🚨 쪼갠 키워드 배열로 바꿔치기해서 보냄!
            };

            const res = await axios.post('http://localhost:5000/api/character/create', payload);
            if (res.data.success) alert(`✨ 조물주 펀치! [${characterData.title}] 세계관 창조 완료!`);
        } catch (error) {
            console.error(error);
            alert('런칭 실패 ㅆㅂ 백엔드 터짐');
        }
    };

    return (
        <div className="studio-container">
            {/* 🛠️ 제작자 모드 상단 탭 헤더 */}
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
                {/* 폼 입력 구역 */}
                <div className="studio-form-scroll">

                    {/* 1. 메인 탭 */}
                    {activeTab === 'main' && (
                        <div className="tab-content">
                            <h3>📝 기본 메타데이터</h3>
                            <div className="form-group"><label>작품 이름</label><input type="text" name="title" value={characterData.title} onChange={handleChange} /></div>
                            <div className="form-group"><label>한 줄 요약</label><input type="text" name="summary" value={characterData.summary} onChange={handleChange} /></div>
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
                            <h3>🖼️ 배경 에셋 등록</h3>
                            <div className="form-group"><label>채팅방 배경 이미지 URL</label><input type="text" name="backgroundUrl" value={characterData.backgroundUrl} onChange={handleChange} /></div>
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
                                            type="text"
                                            value={k.trigger}
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

                {/* 우측 샌드박스 테스터 (채팅창 UI 재활용) */}
                <div className="sandbox-tester">
                    <div className="sandbox-header">SANDBOX TESTER</div>
                    <div style={{ flex: 1, padding: '10px', fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>
                        [테스트 채팅 구역 - 실시간 프롬프트 반영]
                    </div>
                    <div className="chat-input-area">
                        <input type="text" placeholder="테스트 메시지 입력..." />
                        <button>전송</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatorStudio;