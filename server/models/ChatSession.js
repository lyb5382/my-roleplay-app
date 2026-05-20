const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CharacterCard', required: true },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPersona', required: true },
    turnCount: { type: Number, default: 0 },         // 현재 몇 턴 돌았는지 카운트
    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: { type: String },
        swipes: { type: [String], default: [] }, // 👈 [신규] 리롤 돌린 답변들 모아두는 곳
        timestamp: { type: Date, default: Date.now },
        summaryInterval: { type: Number, default: 20 }, // 몇 턴마다 요약할지
        summaryPrompt: { type: String, default: '이전 대화의 핵심 내용과 현재 상황을 3문장 이내로 요약해라.' }, // 요약 지시어
        memorySummary: { type: String, default: '' } // AI가 진짜로 참고할 요약본 텍스트
    }],
    memorySummary: { type: String, default: "" },   // N턴마다 LLM이 압축한 요약본 저장소
    lorebook: [{                                    // 고정 핀 박아놓은 메모장
        key: String,
        value: String
    }],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);