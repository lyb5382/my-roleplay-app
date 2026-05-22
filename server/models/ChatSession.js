const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    characterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CharacterCard', required: true },
    personaId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPersona', required: true },
    turnCount: { type: Number, default: 0 },

    // 🚨 잼스 검거2: 방마다 어떤 뇌(모델) 쓰는지, 유저 시크릿 노트가 뭔지 스키마에 박제!
    model: { type: String, default: 'qwen/qwen-2.5-72b-instruct' },
    userNote: { type: String, default: '' },

    messages: [{
        role: { type: String, enum: ['user', 'assistant', 'system'] },
        content: { type: String },
        swipes: { type: [String], default: [] },
        timestamp: { type: Date, default: Date.now }
    }],
    summaryInterval: { type: Number, default: 20 },
    summaryPrompt: { type: String, default: '이전 대화의 핵심 내용과 현재 상황을 3문장 이내로 요약해라.' },
    memorySummary: { type: String, default: "" },
    lorebook: [{
        key: String,
        value: String
    }],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);